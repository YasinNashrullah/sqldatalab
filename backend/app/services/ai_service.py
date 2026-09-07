import os
import re
from typing import Any
import httpx
from backend.app.core.config import settings
from backend.app.schemas.ai import SchemaContext


class AIService:
    """
    Privacy-safe AI Assistant for SQL Data Lab (Schema-only boundary).
    Supports Multi-Provider routing & Combos:
      - Google Gemini API
      - 9router (OpenAI-compatible gateway)
      - OpenRouter / OpenAI / Local LLMs (Ollama, vLLM)
      - Automatic Combo Fallback between providers
      - Built-in High Quality Rule-Based Fallback (Zero-Downtime Guarantee)
    """

    @classmethod
    def _format_schema_prompt(cls, schema_context: SchemaContext | None) -> str:
        if not schema_context or not schema_context.tables:
            return "No workspace tables provided."
        
        lines = ["Available Workspace Tables and Columns:"]
        for t in schema_context.tables:
            cols = ", ".join([f"{c.name} ({c.type})" for c in t.columns])
            lines.append(f"- Table '{t.table_name}': {cols}")
        return "\n".join(lines)

    @classmethod
    async def _call_gemini(cls, prompt: str, api_key: str, model: str) -> str:
        """Invokes Google Gemini Generative Language API."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        timeout_val = min(float(settings.AI_TIMEOUT_SECONDS), 8.0)
        async with httpx.AsyncClient(timeout=timeout_val) as client:
            resp = await client.post(
                url,
                json={"contents": [{"parts": [{"text": prompt}]}]}
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            raise RuntimeError(f"Gemini API returned status {resp.status_code}: {resp.text}")

    @classmethod
    async def _call_openai_compatible(
        cls,
        prompt: str,
        api_key: str,
        base_url: str,
        model: str,
        system_prompt: str = "You are an expert SQL instructor and Data Analyst mentor."
    ) -> str:
        """Invokes any OpenAI-compatible router (9router, OpenRouter, OpenAI, LocalAI, Ollama)."""
        clean_base = base_url.rstrip("/")
        if not clean_base.endswith("/chat/completions"):
            url = f"{clean_base}/chat/completions"
        else:
            url = clean_base

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        timeout_val = min(float(settings.AI_TIMEOUT_SECONDS), 4.0)
        async with httpx.AsyncClient(timeout=timeout_val) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"]
            raise RuntimeError(f"OpenAI-compatible router ({url}) returned status {resp.status_code}: {resp.text}")

    @classmethod
    async def _dispatch_llm(cls, prompt: str, system_prompt: str | None = None) -> tuple[str | None, str | None]:
        """
        Dispatches prompt across configured providers with combo fallback support.
        Returns: (generated_text, active_provider_name) or (None, None) if all fail.
        """
        candidates: list[dict[str, Any]] = []
        provider = (settings.AI_PROVIDER or "auto").lower().strip()

        # Dedicated 9router provider candidate
        if provider in ("9router", "auto") and (settings.NINEROUTER_API_KEY or (provider == "9router" and settings.AI_API_KEY)):
            candidates.append({
                "type": "openai_compatible",
                "name": "9router",
                "api_key": settings.NINEROUTER_API_KEY or settings.AI_API_KEY,
                "base_url": settings.NINEROUTER_BASE_URL,
                "model": settings.NINEROUTER_MODEL or settings.AI_MODEL,
            })

        # Google Gemini provider candidate
        if provider in ("gemini", "auto") and (settings.GEMINI_API_KEY or (provider == "gemini" and settings.AI_API_KEY)):
            candidates.append({
                "type": "gemini",
                "name": "Google Gemini",
                "api_key": settings.GEMINI_API_KEY or settings.AI_API_KEY,
                "model": settings.GEMINI_MODEL or settings.AI_MODEL,
            })

        # OpenAI-compatible gateway candidate
        if provider in ("openai_compatible", "openrouter", "openai", "custom") or (provider == "auto" and settings.AI_API_KEY and not candidates):
            candidates.append({
                "type": "openai_compatible",
                "name": f"OpenAI-Compatible ({provider})",
                "api_key": settings.AI_API_KEY or settings.OPENAI_API_KEY,
                "base_url": settings.AI_BASE_URL,
                "model": settings.AI_MODEL,
            })

        # Fallback secondary providers when failover is enabled
        if settings.AI_COMBO_FALLBACK:
            existing_names = {c["name"] for c in candidates}
            if "Google Gemini" not in existing_names and settings.GEMINI_API_KEY:
                candidates.append({
                    "type": "gemini",
                    "name": "Google Gemini (Combo Failover)",
                    "api_key": settings.GEMINI_API_KEY,
                    "model": settings.GEMINI_MODEL,
                })
            if "9router" not in existing_names and settings.NINEROUTER_API_KEY:
                candidates.append({
                    "type": "openai_compatible",
                    "name": "9router (Combo Failover)",
                    "api_key": settings.NINEROUTER_API_KEY,
                    "base_url": settings.NINEROUTER_BASE_URL,
                    "model": settings.NINEROUTER_MODEL,
                })

        # Dispatch request sequentially across candidate providers
        for cand in candidates:
            api_key = cand.get("api_key")
            if not api_key:
                continue
            try:
                if cand["type"] == "gemini":
                    text = await cls._call_gemini(prompt, api_key, cand["model"])
                else:
                    text = await cls._call_openai_compatible(
                        prompt=prompt,
                        api_key=api_key,
                        base_url=cand["base_url"],
                        model=cand["model"],
                        system_prompt=system_prompt or "You are an expert SQL instructor and Data Analyst mentor."
                    )
                if text and text.strip():
                    return text.strip(), cand["name"]
            except Exception:
                # Skip to next candidate on provider exception
                continue

        return None, None

    @classmethod
    async def explain_query(cls, query: str, schema_context: SchemaContext | None = None) -> dict[str, Any]:
        """Explain an analytical SQL query."""
        schema_str = cls._format_schema_prompt(schema_context)
        prompt = f"""You are an expert SQL instructor and Data Analyst mentor.
Explain the following SQL query clearly and concisely for an analyst:

```sql
{query}
```

Context Schema:
{schema_str}

Provide:
1. High-level purpose of the query.
2. Step-by-step breakdown of clauses (SELECT, FROM, WHERE, GROUP BY, etc.).
3. Performance or optimization recommendations.
Format in clean Markdown with appropriate emojis and bullet points.
"""
        llm_response, provider = await cls._dispatch_llm(prompt)
        if llm_response:
            return {
                "success": True,
                "explanation": llm_response,
                "provider": provider,
                "is_mock": False,
            }

        # Rule-based query structure explainer fallback
        explanation_lines = [
            "### 🔍 SQL Query Analysis",
            f"**Query Analyzed:**\n```sql\n{query.strip()}\n```",
            "#### 📌 Clause Breakdown:"
        ]
        
        q_upper = query.upper()
        if "SELECT" in q_upper:
            explanation_lines.append("- **SELECT**: Specifies the columns and calculated metrics to be projected in the final result set.")
        if "FROM" in q_upper:
            explanation_lines.append("- **FROM**: Identifies the primary source dataset or table.")
        if "JOIN" in q_upper:
            explanation_lines.append("- **JOIN**: Merges records from multiple tables based on matching key relationships.")
        if "WHERE" in q_upper:
            explanation_lines.append("- **WHERE**: Filters row-level records before any grouping or aggregation takes place.")
        if "GROUP BY" in q_upper:
            explanation_lines.append("- **GROUP BY**: Aggregates rows with identical values in specified columns into summary rows.")
        if "HAVING" in q_upper:
            explanation_lines.append("- **HAVING**: Filters grouped summary data using aggregate conditions.")
        if "ORDER BY" in q_upper:
            explanation_lines.append("- **ORDER BY**: Sorts the resulting records in ascending (ASC) or descending (DESC) sequence.")
        if "LIMIT" in q_upper:
            explanation_lines.append("- **LIMIT**: Restricts the maximum number of rows returned for performance and preview efficiency.")

        explanation_lines.append("\n💡 *Pro-tip: Adding a LIMIT clause during exploratory analysis keeps browser rendering snappy.*")
        return {
            "success": True,
            "explanation": "\n".join(explanation_lines),
            "is_mock": True,
        }

    @classmethod
    async def explain_error(cls, query: str, error_message: str, schema_context: SchemaContext | None = None) -> dict[str, Any]:
        """Explain an error message and offer suggestions."""
        schema_str = cls._format_schema_prompt(schema_context)
        prompt = f"""You are an expert DuckDB and SQL debugger.
An analyst ran the following query and got an error.

Query:
```sql
{query}
```

Error Message:
`{error_message}`

Context Schema:
{schema_str}

Explain why this error occurred in simple terms, and provide a corrected version of the SQL query.
"""
        llm_response, provider = await cls._dispatch_llm(prompt)
        if llm_response:
            return {
                "success": True,
                "explanation": llm_response,
                "provider": provider,
                "is_mock": False,
            }

        # Rule-based error diagnostics fallback
        tips = []
        err_lower = error_message.lower()
        
        if "syntax error" in err_lower:
            tips.append("Check for missing commas between column names in SELECT.")
            tips.append("Verify matching opening and closing parentheses `(` and `)`.")
            tips.append("Ensure SQL keywords (like SELECT, FROM, WHERE) are spelled correctly.")
        elif "table" in err_lower and ("not found" in err_lower or "does not exist" in err_lower):
            tips.append("Double check table names in the Database Explorer sidebar on the left.")
            tips.append("Table names are case-sensitive if created with quotes.")
        elif "column" in err_lower and ("not found" in err_lower or "does not exist" in err_lower):
            tips.append("Expand the table tree in the sidebar to verify exact column spelling.")
            tips.append("If a column name has spaces or reserved words, wrap it in double quotes (e.g. `\"order\"`).")
        else:
            tips.append("Review DuckDB documentation for analytical function syntax.")
            tips.append("Ensure data types match when comparing fields in WHERE or JOIN.")

        explanation = f"""### ⚠️ Error Diagnosis
**Error Encountered:**
`{error_message}`

#### 🛠️ Recommended Steps to Fix:
""" + "\n".join([f"- {tip}" for tip in tips])

        return {
            "success": True,
            "explanation": explanation,
            "is_mock": True,
        }

    @classmethod
    async def generate_sql(cls, prompt: str, schema_context: SchemaContext) -> dict[str, Any]:
        """Generate SQL query from natural language description."""
        schema_str = cls._format_schema_prompt(schema_context)
        llm_prompt = f"""You are an expert SQL assistant.
Generate a valid DuckDB analytical SQL query based on this user instruction:
User Instruction: "{prompt}"

Workspace Schema:
{schema_str}

CRITICAL RULES:
- Use ONLY tables and columns listed in the Workspace Schema.
- Return ONLY the executable SQL query enclosed in a ```sql code block.
- Do NOT include any introductory or concluding conversational text outside the code block.
"""
        llm_response, provider = await cls._dispatch_llm(llm_prompt)
        if llm_response:
            match = re.search(r"```sql\s*([\s\S]*?)\s*```", llm_response)
            sql_text = match.group(1).strip() if match else llm_response.strip()
            return {
                "success": True,
                "explanation": f"Generated SQL query using {provider} for instruction: '{prompt}':",
                "sql_suggestion": sql_text,
                "provider": provider,
                "is_mock": False,
            }

        # Heuristic query generator fallback using available tables
        first_table = schema_context.tables[0].table_name if schema_context.tables else "my_table"
        sql_gen = f"SELECT * FROM \"{first_table}\" LIMIT 50;"
        return {
            "success": True,
            "explanation": f"Generated exploratory query for table `{first_table}`:",
            "sql_suggestion": sql_gen,
            "is_mock": True,
        }
