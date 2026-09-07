import json
import uuid
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.core.errors import NotFoundError
from backend.app.models.base import get_db
from backend.app.models.user import User
from backend.app.models.challenge import Challenge, ChallengeAttempt
from backend.app.schemas.challenge import ChallengeValidateRequest
from backend.app.schemas.base import success_envelope
from backend.app.services.challenge_evaluator import ChallengeEvaluator
from backend.app.services.duckdb_manager import DuckDBManager
from backend.app.api.deps import get_current_user, verify_workspace_access

router = APIRouter(prefix="/challenges", tags=["SQL Challenges"])

DEFAULT_CHALLENGES = [
    {
        "title": "Basic Selection & Filtering",
        "slug": "basic-selection-filtering",
        "difficulty": "Beginner",
        "category": "Fundamentals",
        "description": "Select all customers from 'Indonesia' from the `customers` table. Return their `customer_id`, `name`, and `city`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Write a query to find customers living in Indonesia\nSELECT customer_id, name, city\nFROM customers\nWHERE country = ...;",
        "solution_sql": "SELECT customer_id, name, city FROM customers WHERE country = 'Indonesia';",
        "hints": [
            "Use the WHERE clause with the country column.",
            "Text values in SQL are enclosed in single quotes: 'Indonesia'.",
            "SELECT customer_id, name, city FROM customers WHERE country = 'Indonesia';"
        ],
        "ordinal_rank": 1,
        "points_xp": 50,
    },
    {
        "title": "Wildcard Pattern Matching (LIKE)",
        "slug": "wildcard-pattern-matching",
        "difficulty": "Beginner",
        "category": "Fundamentals",
        "description": "Find customers whose name starts with 'A' OR whose city ends with 'ang'. Return `name` and `city` ordered by `name`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use LIKE with the wildcard %\nSELECT name, city\nFROM customers\nWHERE name LIKE '...' OR city LIKE '...'\nORDER BY name;",
        "solution_sql": "SELECT name, city FROM customers WHERE name LIKE 'A%' OR city LIKE '%ang' ORDER BY name;",
        "hints": [
            "The % symbol matches zero or more characters.",
            "'A%' matches any string starting with 'A'.",
            "'%ang' matches any string ending with 'ang'."
        ],
        "ordinal_rank": 2,
        "points_xp": 50,
    },
    {
        "title": "Top Orders & Distinct Slices",
        "slug": "top-orders-distinct-slices",
        "difficulty": "Beginner",
        "category": "Fundamentals",
        "description": "List the top 3 highest order amounts from the `orders` table. Return `order_id`, `category`, and `amount` ordered by amount descending.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Sort by amount descending and take the top 3\nSELECT order_id, category, amount\nFROM orders\nORDER BY ... DESC\nLIMIT ...;",
        "solution_sql": "SELECT order_id, category, amount FROM orders ORDER BY amount DESC LIMIT 3;",
        "hints": [
            "Use ORDER BY amount DESC to put the largest numbers first.",
            "Use LIMIT 3 to only return the top 3 rows."
        ],
        "ordinal_rank": 3,
        "points_xp": 75,
    },
    {
        "title": "Handling NULL Values & COALESCE",
        "slug": "null-handling-coalesce",
        "difficulty": "Beginner",
        "category": "Fundamentals",
        "description": "Select `customer_id`, `name`, and replace any potential null with 'Unknown' using `COALESCE(country, 'Unknown') AS country_clean` ordered by `customer_id`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use COALESCE to fallback to 'Unknown'\nSELECT customer_id, name, COALESCE(country, 'Unknown') AS country_clean\nFROM customers\nORDER BY customer_id;",
        "solution_sql": "SELECT customer_id, name, COALESCE(country, 'Unknown') AS country_clean FROM customers ORDER BY customer_id;",
        "hints": [
            "COALESCE(val, fallback) returns the first non-null argument.",
            "Don't forget to alias the column as country_clean.",
            "Order by customer_id."
        ],
        "ordinal_rank": 4,
        "points_xp": 75,
    },
    {
        "title": "Aggregation & Revenue Calculation",
        "slug": "aggregation-revenue-calculation",
        "difficulty": "Intermediate",
        "category": "Aggregations",
        "description": "Calculate total revenue per `category` from the `orders` table. Group by category and order by total revenue descending. Label the calculated column `total_revenue`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Group by category and sum the amount column\nSELECT category, SUM(...) AS total_revenue\nFROM orders\nGROUP BY ...\nORDER BY ... DESC;",
        "solution_sql": "SELECT category, SUM(amount) AS total_revenue FROM orders GROUP BY category ORDER BY total_revenue DESC;",
        "hints": [
            "Use the SUM(amount) function and alias it with AS total_revenue.",
            "Group the results using GROUP BY category.",
            "Add ORDER BY total_revenue DESC at the end."
        ],
        "ordinal_rank": 5,
        "points_xp": 100,
    },
    {
        "title": "Filtering Grouped Data with HAVING",
        "slug": "filtering-grouped-data-having",
        "difficulty": "Intermediate",
        "category": "Aggregations",
        "description": "Find categories where the sum of order amounts exceeds 200. Return `category` and `SUM(amount) AS total_amount`, sorted by total amount descending.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use HAVING after GROUP BY to filter aggregates\nSELECT category, SUM(amount) AS total_amount\nFROM orders\nGROUP BY category\nHAVING ... > 200\nORDER BY total_amount DESC;",
        "solution_sql": "SELECT category, SUM(amount) AS total_amount FROM orders GROUP BY category HAVING SUM(amount) > 200 ORDER BY total_amount DESC;",
        "hints": [
            "WHERE filters rows before grouping; HAVING filters aggregated groups.",
            "Use HAVING SUM(amount) > 200.",
            "Alias SUM(amount) AS total_amount."
        ],
        "ordinal_rank": 6,
        "points_xp": 125,
    },
    {
        "title": "Customer Order Insights (INNER JOIN)",
        "slug": "customer-order-insights-join",
        "difficulty": "Intermediate",
        "category": "Joins",
        "description": "Join the `customers` and `orders` tables. Return `customers.name`, `orders.order_id`, and `orders.amount` for orders where amount is greater than 100, ordered by amount descending.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Perform an INNER JOIN between customers and orders\nSELECT c.name, o.order_id, o.amount\nFROM customers c\nJOIN orders o ON c.customer_id = o.customer_id\nWHERE o.amount > 100\nORDER BY o.amount DESC;",
        "solution_sql": "SELECT c.name, o.order_id, o.amount FROM customers c JOIN orders o ON c.customer_id = o.customer_id WHERE o.amount > 100 ORDER BY o.amount DESC;",
        "hints": [
            "Use JOIN orders o ON c.customer_id = o.customer_id to connect both tables.",
            "Filter rows using WHERE o.amount > 100.",
            "Sort descending with ORDER BY o.amount DESC."
        ],
        "ordinal_rank": 7,
        "points_xp": 125,
    },
    {
        "title": "Customer Order Count (LEFT JOIN)",
        "slug": "customer-order-count-left-join",
        "difficulty": "Intermediate",
        "category": "Joins",
        "description": "Find all customers and count how many orders each has placed. Return `c.name` and `COUNT(o.order_id) AS total_orders`. Order by `total_orders DESC`, then `c.name ASC`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use LEFT JOIN to include all customers\nSELECT c.name, COUNT(o.order_id) AS total_orders\nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id\nGROUP BY c.name\nORDER BY total_orders DESC, c.name ASC;",
        "solution_sql": "SELECT c.name, COUNT(o.order_id) AS total_orders FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name ORDER BY total_orders DESC, c.name ASC;",
        "hints": [
            "LEFT JOIN ensures customers without orders still appear with count 0.",
            "Use COUNT(o.order_id) instead of COUNT(*) so null joins return 0.",
            "Group by c.name."
        ],
        "ordinal_rank": 8,
        "points_xp": 150,
    },
    {
        "title": "Top Spenders Window Function",
        "slug": "top-spenders-window-function",
        "difficulty": "Advanced",
        "category": "Window Functions",
        "description": "Rank orders within each category by amount from highest to lowest using `DENSE_RANK()`. Return `order_id`, `category`, `amount`, and `order_rank` ordered by `category`, then `order_rank`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use DENSE_RANK() OVER (PARTITION BY ... ORDER BY ... DESC)\nSELECT order_id, category, amount,\n       DENSE_RANK() OVER (PARTITION BY category ORDER BY amount DESC) AS order_rank\nFROM orders\nORDER BY category, order_rank;",
        "solution_sql": "SELECT order_id, category, amount, DENSE_RANK() OVER (PARTITION BY category ORDER BY amount DESC) AS order_rank FROM orders ORDER BY category, order_rank;",
        "hints": [
            "Window functions use the OVER clause: DENSE_RANK() OVER (...).",
            "Partition the window by category: PARTITION BY category.",
            "Sort within each category partition: ORDER BY amount DESC."
        ],
        "ordinal_rank": 9,
        "points_xp": 200,
    },
    {
        "title": "Running Cumulative Revenue",
        "slug": "running-cumulative-revenue",
        "difficulty": "Advanced",
        "category": "Window Functions",
        "description": "Calculate the running cumulative total of order amounts over time. Return `order_id`, `order_date`, `amount`, and `running_revenue` ordered by `order_date` and `order_id`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use SUM(amount) OVER (ORDER BY order_date, order_id) AS running_revenue\nSELECT order_id, order_date, amount,\n       SUM(amount) OVER (ORDER BY order_date, order_id) AS running_revenue\nFROM orders\nORDER BY order_date, order_id;",
        "solution_sql": "SELECT order_id, order_date, amount, SUM(amount) OVER (ORDER BY order_date, order_id) AS running_revenue FROM orders ORDER BY order_date, order_id;",
        "hints": [
            "Cumulative window sums do not need a PARTITION BY clause if summing over the entire table.",
            "Use SUM(amount) OVER (ORDER BY order_date, order_id).",
            "Alias as running_revenue."
        ],
        "ordinal_rank": 10,
        "points_xp": 225,
    },
    {
        "title": "Multi-Step Reporting with CTE",
        "slug": "multi-step-reporting-cte",
        "difficulty": "Expert",
        "category": "CTEs",
        "description": "Using a Common Table Expression (CTE) named `customer_spending`, calculate the total spend per customer. Then select only customers whose `total_spent` exceeds 500, returning `name` and `total_spent` ordered by `total_spent DESC`.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Define a CTE with the WITH clause\nWITH customer_spending AS (\n    SELECT c.name, SUM(o.amount) AS total_spent\n    FROM customers c\n    JOIN orders o ON c.customer_id = o.customer_id\n    GROUP BY c.name\n)\nSELECT name, total_spent\nFROM customer_spending\nWHERE total_spent > 500\nORDER BY total_spent DESC;",
        "solution_sql": "WITH customer_spending AS (SELECT c.name, SUM(o.amount) AS total_spent FROM customers c JOIN orders o ON c.customer_id = o.customer_id GROUP BY c.name) SELECT name, total_spent FROM customer_spending WHERE total_spent > 500 ORDER BY total_spent DESC;",
        "hints": [
            "Start with: WITH customer_spending AS ( ... ).",
            "Inside the CTE, join customers and orders, grouping by name.",
            "Outside the CTE, filter with WHERE total_spent > 500."
        ],
        "ordinal_rank": 11,
        "points_xp": 250,
    },
    {
        "title": "Order Value Tier Segmentation",
        "slug": "order-value-tier-segmentation",
        "difficulty": "Expert",
        "category": "CTEs",
        "description": "Segment each order using a CASE statement: if amount >= 500 then 'High Value', if amount >= 100 then 'Mid Value', else 'Low Value'. Return `order_id`, `amount`, and `value_tier` ordered by amount descending.",
        "target_dataset_slug": "sales_demo",
        "starter_sql": "-- Use CASE WHEN amount >= 500 THEN ... END AS value_tier\nSELECT order_id, amount,\n       CASE\n           WHEN amount >= 500 THEN 'High Value'\n           WHEN amount >= 100 THEN 'Mid Value'\n           ELSE 'Low Value'\n       END AS value_tier\nFROM orders\nORDER BY amount DESC;",
        "solution_sql": "SELECT order_id, amount, CASE WHEN amount >= 500 THEN 'High Value' WHEN amount >= 100 THEN 'Mid Value' ELSE 'Low Value' END AS value_tier FROM orders ORDER BY amount DESC;",
        "hints": [
            "CASE statements evaluate sequentially from top to bottom.",
            "Use WHEN amount >= 500 THEN 'High Value'.",
            "Alias the resulting column with AS value_tier."
        ],
        "ordinal_rank": 12,
        "points_xp": 300,
    },
]


async def seed_or_update_challenges(db: AsyncSession):
    """Seed or update curriculum challenges to guarantee all 12 challenges exist."""
    res = await db.execute(select(Challenge))
    existing_list = res.scalars().all()
    existing_by_slug = {c.slug: c for c in existing_list}

    for item in DEFAULT_CHALLENGES:
        slug = item["slug"]
        hints_str = json.dumps(item["hints"])
        if slug in existing_by_slug:
            # Update fields
            c = existing_by_slug[slug]
            c.title = item["title"]
            c.difficulty = item["difficulty"]
            c.category = item["category"]
            c.description = item["description"]
            c.starter_sql = item["starter_sql"]
            c.solution_sql = item["solution_sql"]
            c.hints_json = hints_str
            c.ordinal_rank = item["ordinal_rank"]
            c.points_xp = item["points_xp"]
        else:
            # Insert new
            c = Challenge(
                id=str(uuid.uuid4()),
                title=item["title"],
                slug=slug,
                difficulty=item["difficulty"],
                category=item["category"],
                description=item["description"],
                target_dataset_slug=item["target_dataset_slug"],
                starter_sql=item["starter_sql"],
                solution_sql=item["solution_sql"],
                hints_json=hints_str,
                ordinal_rank=item["ordinal_rank"],
                points_xp=item["points_xp"],
            )
            db.add(c)

    await db.commit()


def ensure_demo_dataset_in_workspace(workspace_id: str):
    """Creates customers and orders demo tables in DuckDB workspace catalog if not present."""
    con = DuckDBManager.get_connection(workspace_id)
    con.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        customer_id VARCHAR PRIMARY KEY,
        name VARCHAR,
        city VARCHAR,
        country VARCHAR,
        signup_date DATE
    );
    """)
    count = con.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    if count == 0:
        con.execute("""
        INSERT INTO customers VALUES
        ('C001', 'Ahmad Fadillah', 'Jakarta', 'Indonesia', '2025-01-10'),
        ('C002', 'Budi Santoso', 'Surabaya', 'Indonesia', '2025-02-14'),
        ('C003', 'Citra Dewi', 'Bandung', 'Indonesia', '2025-03-01'),
        ('C004', 'David Tan', 'Singapore', 'Singapore', '2025-01-20'),
        ('C005', 'Elena Rostova', 'Kuala Lumpur', 'Malaysia', '2025-04-12');
        """)

    con.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR PRIMARY KEY,
        customer_id VARCHAR,
        category VARCHAR,
        amount DOUBLE,
        order_date DATE
    );
    """)
    order_count = con.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    if order_count == 0:
        con.execute("""
        INSERT INTO orders VALUES
        ('ORD-101', 'C001', 'Electronics', 450.00, '2025-05-01'),
        ('ORD-102', 'C001', 'Books', 35.50, '2025-05-03'),
        ('ORD-103', 'C002', 'Electronics', 820.00, '2025-05-05'),
        ('ORD-104', 'C003', 'Clothing', 120.00, '2025-05-07'),
        ('ORD-105', 'C004', 'Electronics', 1250.00, '2025-05-10'),
        ('ORD-106', 'C005', 'Books', 95.00, '2025-05-12'),
        ('ORD-107', 'C002', 'Clothing', 65.00, '2025-05-15');
        """)


@router.get("")
async def list_challenges(
    request: Request,
    difficulty: str | None = None,
    category: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_chal")
    await seed_or_update_challenges(db)

    query = select(Challenge).order_by(Challenge.ordinal_rank)
    if difficulty and difficulty.lower() != "all":
        query = query.where(Challenge.difficulty.ilike(difficulty))
    if category and category.lower() != "all":
        query = query.where(Challenge.category.ilike(category))

    res = await db.execute(query)
    challenges = res.scalars().all()

    # Get user's completed challenges
    att_query = select(ChallengeAttempt.challenge_id).where(
        ChallengeAttempt.user_id == user.id,
        ChallengeAttempt.is_passed == True,
    )
    att_res = await db.execute(att_query)
    completed_ids = set(att_res.scalars().all())

    items = []
    total_xp = 0
    earned_xp = 0
    for c in challenges:
        hints = json.loads(c.hints_json) if c.hints_json else []
        is_done = c.id in completed_ids
        points = getattr(c, "points_xp", 100)
        total_xp += points
        if is_done:
            earned_xp += points

        items.append({
            "id": c.id,
            "title": c.title,
            "slug": c.slug,
            "difficulty": c.difficulty,
            "category": c.category,
            "description": c.description,
            "target_dataset_slug": c.target_dataset_slug,
            "starter_sql": c.starter_sql,
            "hints": hints,
            "ordinal_rank": c.ordinal_rank,
            "points_xp": points,
            "is_completed": is_done,
        })

    return success_envelope({
        "challenges": items,
        "stats": {
            "total": len(items),
            "completed": len([i for i in items if i["is_completed"]]),
            "earned_xp": earned_xp,
            "total_xp": total_xp,
        }
    }, req_id)


@router.get("/{id}")
async def get_challenge(
    id: str,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_chal_detail")
    query = select(Challenge).where(Challenge.id == id)
    res = await db.execute(query)
    c = res.scalar_one_or_none()
    if not c:
        raise NotFoundError("Challenge not found.")

    hints = json.loads(c.hints_json) if c.hints_json else []
    data = {
        "id": c.id,
        "title": c.title,
        "slug": c.slug,
        "difficulty": c.difficulty,
        "category": c.category,
        "description": c.description,
        "target_dataset_slug": c.target_dataset_slug,
        "starter_sql": c.starter_sql,
        "hints": hints,
        "ordinal_rank": c.ordinal_rank,
        "points_xp": getattr(c, "points_xp", 100),
    }
    return success_envelope(data, req_id)


@router.post("/{id}/validate")
async def validate_challenge(
    id: str,
    payload: ChallengeValidateRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    req_id = getattr(request.state, "request_id", "req_chal_val")
    await verify_workspace_access(workspace_id=payload.workspace_id, user=user, db=db)

    query = select(Challenge).where(Challenge.id == id)
    res = await db.execute(query)
    challenge = res.scalar_one_or_none()
    if not challenge:
        raise NotFoundError("Challenge not found.")

    # Ensure demo tables exist in workspace
    ensure_demo_dataset_in_workspace(payload.workspace_id)

    # Evaluate query
    eval_result = ChallengeEvaluator.evaluate(
        workspace_id=payload.workspace_id,
        user_sql=payload.submitted_sql,
        solution_sql=challenge.solution_sql,
    )

    # Record attempt
    attempt = ChallengeAttempt(
        id=str(uuid.uuid4()),
        user_id=user.id,
        challenge_id=challenge.id,
        submitted_sql=payload.submitted_sql,
        is_passed=eval_result["is_passed"],
        execution_time_ms=eval_result["execution_time_ms"],
        error_details=eval_result["diff_details"],
    )
    db.add(attempt)
    await db.commit()

    eval_result["points_xp"] = getattr(challenge, "points_xp", 100)
    return success_envelope(eval_result, req_id)
