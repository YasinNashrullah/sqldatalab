import os
import csv
import random
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATASET_DIR = BASE_DIR / "sample_data" / "dataset"

def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

def write_csv(file_path: Path, headers: list[str], rows: list[list]):
    ensure_dir(file_path.parent)
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Created: {file_path} ({len(rows)} rows)")

def generate_e_commerce():
    sales_dir = DATASET_DIR / "E-Commers" / "sales"
    
    # 1. Customers
    cust_ids = [f"CUST-{i:03d}" for i in range(1, 41)]
    names = ["Budi Santoso", "Siti Rahma", "Ahmad Fauzi", "Dewi Lestari", "Rian Hidayat",
             "Eka Prasetya", "Putri Utami", "Dimas Anggara", "Maya Indah", "Bayu Pratama",
             "Nadia Safitri", "Reza Kurniawan", "Anisa Maharani", "Fajar Nugraha", "Dian Sastro",
             "Gilang Ramadhan", "Hana Pertiwi", "Indra Wijaya", "Joko Widodo", "Kartika Sari",
             "Lukman Hakim", "Mega Suryani", "Naufal Zaki", "Olivia Gunawan", "Panji Pradana",
             "Qori Fadhilah", "Rangga Pratama", "Siska Amelia", "Taufik Hidayat", "Umar Faruq",
             "Vina Panduwinata", "Wahyu Setiawan", "Xavier Tan", "Yolanda Putri", "Zainal Abidin",
             "Adit Pratama", "Bunga Citra", "Candra Wijaya", "Dina Mariana", "Edwin Kusuma"]
    cities = ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Denpasar", "Makassar", "Yogyakarta"]
    tiers = ["Bronze", "Silver", "Gold", "Platinum"]
    
    customers_rows = []
    for i, cid in enumerate(cust_ids):
        customers_rows.append([
            cid, names[i % len(names)], f"{cid.lower()}@example.com",
            random.choice(cities), random.choice(tiers), f"2025-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        ])
    write_csv(sales_dir / "customers.csv", ["customer_id", "customer_name", "email", "city", "membership_tier", "signup_date"], customers_rows)

    # 2. Products
    prod_ids = [f"PROD-{i:03d}" for i in range(1, 26)]
    prod_data = [
        ("Wireless Headphones", "Electronics", 450000, 85),
        ("Mechanical Keyboard RGB", "Electronics", 620000, 42),
        ("USB-C Hub 7-in-1", "Electronics", 280000, 110),
        ("Ergonomic Mouse", "Electronics", 310000, 65),
        ("Smart Fitness Watch", "Electronics", 850000, 30),
        ("Leather Sneakers", "Fashion", 490000, 50),
        ("Slim Fit Chino Pants", "Fashion", 240000, 95),
        ("Denim Jacket Vintage", "Fashion", 420000, 38),
        ("Cotton Casual Shirt", "Fashion", 185000, 120),
        ("Backpack Travel Pro", "Fashion", 350000, 75),
        ("Mastering SQL Analytics", "Books", 150000, 200),
        ("Python Data Science Hand", "Books", 195000, 150),
        ("Database Systems Design", "Books", 220000, 80),
        ("Clean Code Principles", "Books", 175000, 130),
        ("Modern Business Intel", "Books", 160000, 90),
        ("Hydrating Face Serum", "Beauty", 145000, 140),
        ("Organic Herbal Shampoo", "Beauty", 90000, 180),
        ("Sunscreen SPF 50 PA+", "Beauty", 110000, 160),
        ("Deep Cleansing Facial Foam", "Beauty", 75000, 210),
        ("Body Lotion Shea Butter", "Beauty", 85000, 175),
        ("Yoga Mat Eco-Friendly", "Sports", 175000, 80),
        ("Resistance Bands Set", "Sports", 95000, 150),
        ("Stainless Water Bottle", "Sports", 125000, 120),
        ("Running Shoes Breathable", "Sports", 550000, 45),
        ("Adjustable Dumbbell 10KG", "Sports", 380000, 35),
    ]
    products_rows = []
    for i, pid in enumerate(prod_ids):
        name, cat, price, stock = prod_data[i]
        products_rows.append([pid, name, cat, price, stock])
    write_csv(sales_dir / "products.csv", ["product_id", "product_name", "category", "price", "stock"], products_rows)

    # 3. Orders
    orders_rows = []
    statuses = ["Completed", "Shipped", "Processing", "Cancelled"]
    payments = ["Credit Card", "Bank Transfer", "E-Wallet", "COD", "PayLater"]
    for i in range(1, 81):
        oid = f"ORD-2026{i:03d}"
        cid = random.choice(cust_ids)
        pid = random.choice(prod_ids)
        qty = random.randint(1, 4)
        pid_idx = int(pid.split('-')[1]) - 1
        price = prod_data[pid_idx][2]
        total = qty * price
        orders_rows.append([
            oid, cid, pid, f"2026-0{random.randint(1,2)}-{random.randint(1,28):02d}",
            qty, total, random.choice(payments), random.choice(cities), random.choice(statuses)
        ])
    write_csv(sales_dir / "orders.csv", ["order_id", "customer_id", "product_id", "order_date", "quantity", "total_amount", "payment_method", "shipping_city", "order_status"], orders_rows)

def generate_fintech():
    banking_dir = DATASET_DIR / "FinTech" / "banking"
    
    # 1. Accounts
    acc_ids = [f"ACC-{i:04d}" for i in range(1001, 1041)]
    types = ["Savings", "Checking", "Business", "Investment"]
    accounts_rows = []
    for aid in acc_ids:
        accounts_rows.append([
            aid, f"Customer {aid[-3:]}", random.choice(types),
            random.randint(500000, 85000000), "Active", f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        ])
    write_csv(banking_dir / "accounts.csv", ["account_id", "customer_name", "account_type", "balance_idr", "status", "opened_date"], accounts_rows)

    # 2. Merchants
    merchants_rows = [
        ("MCH-001", "Tokopedia Official", "E-Commerce", "Jakarta", 0.015),
        ("MCH-002", "Shopee Pay Merchant", "E-Commerce", "Jakarta", 0.015),
        ("MCH-003", "Indomaret Point", "Retail Grocery", "Surabaya", 0.010),
        ("MCH-004", "Alfamart Express", "Retail Grocery", "Bandung", 0.010),
        ("MCH-005", "Starbucks Coffee", "Food & Beverage", "Denpasar", 0.020),
        ("MCH-006", "Kopi Kenangan", "Food & Beverage", "Jakarta", 0.018),
        ("MCH-007", "Cinema XXI", "Entertainment", "Medan", 0.020),
        ("MCH-008", "PLN Pascabayar", "Utilities", "Jakarta", 0.005),
        ("MCH-009", "Telkomsel Halo", "Telecom", "Jakarta", 0.008),
        ("MCH-010", "Bluebird Taxi", "Transportation", "Semarang", 0.015),
    ]
    write_csv(banking_dir / "merchants.csv", ["merchant_id", "merchant_name", "category", "city", "fee_rate"], merchants_rows)

    # 3. Transactions
    mch_ids = [m[0] for m in merchants_rows]
    tx_types = ["TRANSFER_OUT", "TRANSFER_IN", "PAYMENT_QRIS", "DEBIT_PURCHASE", "BILL_PAYMENT", "CASH_WITHDRAWAL"]
    tx_rows = []
    for i in range(1, 85):
        tid = f"TXN-2026{i:04d}"
        aid = random.choice(acc_ids)
        mid = random.choice(mch_ids) if random.random() > 0.3 else "DIRECT"
        amount = random.randint(25000, 5000000)
        fee = int(amount * 0.01) if mid != "DIRECT" else 2500
        is_fraud = "YES" if random.random() < 0.05 else "NO"
        tx_rows.append([
            tid, aid, mid, f"2026-02-{random.randint(1,28):02d} {random.randint(8,21):02d}:{random.randint(10,59):02d}:00",
            random.choice(tx_types), amount, fee, "SUCCESS" if is_fraud == "NO" else "FLAGGED_FRAUD", is_fraud
        ])
    write_csv(banking_dir / "transactions.csv", ["transaction_id", "account_id", "merchant_id", "transaction_time", "transaction_type", "amount_idr", "fee_idr", "status", "is_fraud"], tx_rows)

def generate_healthcare():
    hosp_dir = DATASET_DIR / "Healthcare" / "hospital"
    
    # 1. Doctors
    docs_rows = [
        ("DOC-01", "dr. Budi Setiawan, Sp.PD", "Penyakit Dalam", "Internal Medicine", "Room 201"),
        ("DOC-02", "dr. Sarah Kartika, Sp.JP", "Jantung & Pembuluh", "Cardiology", "Room 305"),
        ("DOC-03", "dr. Hendra Wijaya, Sp.B", "Bedah Umum", "General Surgery", "Room 102"),
        ("DOC-04", "dr. Maya Indriani, Sp.A", "Kesehatan Anak", "Pediatrics", "Room 108"),
        ("DOC-05", "dr. Andi Pratama, Sp.S", "Saraf & Neurologi", "Neurology", "Room 204"),
        ("DOC-06", "dr. Ratna Juwita, Sp.OG", "Kebidanan & Kandungan", "Obstetrics", "Room 301"),
        ("DOC-07", "dr. Faisal Rahman, Sp.P", "Paru & Respirasi", "Pulmonology", "Room 209"),
        ("DOC-08", "dr. Jessica Tan, Sp.THT", "THT-KL", "ENT", "Room 105"),
    ]
    write_csv(hosp_dir / "doctors.csv", ["doctor_id", "doctor_name", "specialization", "department", "room_number"], docs_rows)

    # 2. Patients
    p_ids = [f"PAT-{i:03d}" for i in range(1, 41)]
    genders = ["M", "F"]
    bloods = ["A+", "B+", "AB+", "O+", "O-"]
    patients_rows = []
    for pid in p_ids:
        patients_rows.append([
            pid, f"Patient {pid[-3:]}", random.choice(genders),
            f"{random.randint(1960, 2010)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            random.choice(bloods), f"0812{random.randint(10000000, 99999999)}"
        ])
    write_csv(hosp_dir / "patients.csv", ["patient_id", "full_name", "gender", "birth_date", "blood_type", "phone_number"], patients_rows)

    # 3. Admissions
    diagnoses = ["Hipertensi Primer", "Diabetes Melitus Tipe 2", "Demam Berdarah Dengue", "Bronkitis Akut",
                 "Gastritis Kronis", "Apendisitis Akut", "Penyakit Jantung Koroner", "Migrain Berat"]
    admissions_rows = []
    for i in range(1, 71):
        aid = f"ADM-2026{i:03d}"
        pid = random.choice(p_ids)
        did = random.choice(docs_rows)[0]
        days = random.randint(1, 8)
        cost = days * random.randint(750000, 2500000)
        covered = int(cost * random.choice([0.8, 0.9, 1.0, 0.0]))
        admissions_rows.append([
            aid, pid, did, f"2026-01-{random.randint(1,20):02d}", f"2026-01-{random.randint(21,28):02d}",
            random.choice(diagnoses), days, cost, covered, "BPJS" if covered > 0 else "Mandiri"
        ])
    write_csv(hosp_dir / "admissions.csv", ["admission_id", "patient_id", "doctor_id", "admission_date", "discharge_date", "diagnosis", "length_of_stay_days", "total_cost_idr", "insurance_covered_idr", "payment_type"], admissions_rows)

def generate_hr():
    hr_dir = DATASET_DIR / "Human-Resources" / "company"
    
    # 1. Departments
    dept_rows = [
        ("D01", "Engineering & Tech", "Rian Hidayat", 450000000, 4),
        ("D02", "Product & Design", "Maya Indah", 220000000, 4),
        ("D03", "Marketing & Growth", "Putri Utami", 350000000, 3),
        ("D04", "Sales & Enterprise", "Budi Santoso", 400000000, 3),
        ("D05", "Finance & Accounting", "Siti Rahma", 180000000, 2),
        ("D06", "Human Capital & Culture", "Dewi Lestari", 150000000, 2),
    ]
    write_csv(hr_dir / "departments.csv", ["department_id", "department_name", "head_of_department", "annual_budget_idr", "office_floor"], dept_rows)

    # 2. Employees
    emp_rows = []
    titles = ["Senior Engineer", "Data Analyst", "Product Manager", "UI/UX Designer", "Account Executive", "HR Specialist", "Accountant"]
    modes = ["WFO", "Hybrid", "Remote"]
    for i in range(1, 61):
        eid = f"EMP-{i:03d}"
        dept = random.choice(dept_rows)[0]
        score = round(random.uniform(3.2, 5.0), 2)
        emp_rows.append([
            eid, f"Employee {i:03d}", dept, random.choice(titles),
            f"202{random.randint(1,5)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            random.choice(modes), score, "Active"
        ])
    write_csv(hr_dir / "employees.csv", ["employee_id", "full_name", "department_id", "job_title", "hire_date", "work_mode", "performance_score", "status"], emp_rows)

    # 3. Salaries
    salaries_rows = []
    for emp in emp_rows:
        eid = emp[0]
        base = random.randint(8000000, 28000000)
        bonus = int(base * (emp[6] / 10))
        deductions = int(base * 0.05)
        net = base + bonus - deductions
        salaries_rows.append([f"SAL-{eid}", eid, base, bonus, deductions, net, "Monthly"])
    write_csv(hr_dir / "salaries.csv", ["salary_id", "employee_id", "base_salary_idr", "performance_bonus_idr", "tax_deductions_idr", "net_salary_idr", "pay_frequency"], salaries_rows)

def generate_logistics():
    log_dir = DATASET_DIR / "Logistics" / "supply_chain"
    
    # 1. Warehouses
    warehouses_rows = [
        ("HUB-JKT", "Jakarta Central Hub", "Jakarta Utara", "DKI Jakarta", 15000),
        ("HUB-SBY", "Surabaya Gateway Hub", "Surabaya", "Jawa Timur", 12000),
        ("HUB-BDG", "Bandung Hub West", "Bandung", "Jawa Barat", 8000),
        ("HUB-SMG", "Semarang Transit Hub", "Semarang", "Jawa Tengah", 7500),
        ("HUB-MDN", "Sumatera Distribution Hub", "Medan", "Sumatera Utara", 9000),
        ("HUB-DPS", "Bali & Nusa Hub", "Denpasar", "Bali", 6000),
    ]
    write_csv(log_dir / "warehouses.csv", ["hub_id", "hub_name", "city", "province", "capacity_sqm"], warehouses_rows)

    # 2. Carriers
    carriers_rows = [
        ("CAR-01", "JNE Express", "Air & Ground Cargo", 4.7, "021-29278888"),
        ("CAR-02", "SiCepat Ekspres", "Next Day & Same Day", 4.8, "021-50200050"),
        ("CAR-03", "J&T Cargo", "Heavy & Bulky Cargo", 4.6, "021-80661888"),
        ("CAR-04", "Lion Parcel", "Air Freight Domestic", 4.5, "021-80820072"),
        ("CAR-05", "Pos Indonesia", "Universal Postal Freight", 4.4, "161"),
    ]
    write_csv(log_dir / "carriers.csv", ["carrier_id", "carrier_name", "service_type", "customer_rating", "hotline"], carriers_rows)

    # 3. Shipments
    hub_ids = [h[0] for h in warehouses_rows]
    car_ids = [c[0] for c in carriers_rows]
    shipments_rows = []
    for i in range(1, 81):
        trk = f"EXP-2026{i:04d}"
        orig = random.choice(hub_ids)
        dest = random.choice([h for h in hub_ids if h != orig])
        car = random.choice(car_ids)
        weight = round(random.uniform(0.5, 35.0), 1)
        cost = int(weight * random.randint(15000, 45000))
        est = random.randint(1, 4)
        act = est + random.choice([0, 0, 0, 1, 2])
        delayed = "YES" if act > est else "NO"
        shipments_rows.append([
            trk, orig, dest, car, weight, cost, f"2026-02-{random.randint(1,28):02d}", est, act, "Delivered" if act <= est else "Delayed", delayed
        ])
    write_csv(log_dir / "shipments.csv", ["tracking_no", "origin_hub_id", "dest_hub_id", "carrier_id", "weight_kg", "shipping_cost_idr", "shipment_date", "est_days", "actual_days", "delivery_status", "is_delayed"], shipments_rows)

def generate_education():
    edu_dir = DATASET_DIR / "Education" / "university"
    
    # 1. Courses
    courses_rows = [
        ("CS-101", "Introduction to Computer Science", 3, "Informatics", 1),
        ("CS-202", "Data Structures & Algorithms", 4, "Informatics", 3),
        ("CS-305", "Database Systems & SQL Design", 3, "Information Systems", 5),
        ("CS-410", "Big Data Analytics & Engineering", 3, "Data Science", 7),
        ("DS-201", "Applied Probability & Statistics", 3, "Data Science", 3),
        ("IS-204", "Business Process Management", 3, "Information Systems", 4),
        ("IS-301", "Enterprise Resource Planning", 3, "Information Systems", 5),
        ("CS-499", "Capstone Final Project", 6, "Informatics", 8),
    ]
    write_csv(edu_dir / "courses.csv", ["course_id", "course_name", "credits", "department", "semester_offered"], courses_rows)

    # 2. Students
    students_rows = []
    majors = ["Informatics", "Information Systems", "Data Science"]
    for i in range(1, 51):
        sid = f"STD-2023{i:03d}"
        gpa = round(random.uniform(2.8, 4.0), 2)
        scholar = "YES" if gpa >= 3.75 else "NO"
        students_rows.append([
            sid, f"Student {i:03d}", "Faculty of Computer Science", random.choice(majors),
            random.choice([2, 4, 6, 8]), gpa, scholar
        ])
    write_csv(edu_dir / "students.csv", ["student_id", "student_name", "faculty", "major", "current_semester", "current_gpa", "scholarship_awardee"], students_rows)

    # 3. Enrollments
    c_ids = [c[0] for c in courses_rows]
    grades = ["A", "A-", "B+", "B", "B-", "C+", "C"]
    enrollments_rows = []
    eid = 1
    for s in students_rows:
        sid = s[0]
        # Enroll in 2-3 courses
        enrolled_courses = random.sample(c_ids, random.randint(2, 3))
        for cid in enrolled_courses:
            enrollments_rows.append([
                f"ENR-{eid:04d}", sid, cid, "2025/2026 Genap", random.choice(grades), random.randint(75, 100)
            ])
            eid += 1
    write_csv(edu_dir / "enrollments.csv", ["enrollment_id", "student_id", "course_id", "academic_term", "final_grade", "attendance_pct"], enrollments_rows)

def generate_retail():
    ret_dir = DATASET_DIR / "Retail" / "inventory"
    
    # 1. Suppliers
    suppliers_rows = [
        ("SUP-01", "PT Sumber Pangan Sejahtera", "Jakarta", 3, 4.8),
        ("SUP-02", "CV Mega Distribusi Elektronik", "Surabaya", 5, 4.6),
        ("SUP-03", "PT Surya Garment Nusantara", "Bandung", 4, 4.7),
        ("SUP-04", "PT Mitra Kosmetik Sejati", "Semarang", 2, 4.9),
        ("SUP-05", "CV Aneka Houseware Lestari", "Yogyakarta", 4, 4.5),
    ]
    write_csv(ret_dir / "suppliers.csv", ["supplier_id", "supplier_name", "city", "lead_time_days", "vendor_rating"], suppliers_rows)

    # 2. Products
    products_rows = [
        ("SKU-101", "Beras Premium 5KG", "Groceries", 75000),
        ("SKU-102", "Minyak Goreng Refill 2L", "Groceries", 36000),
        ("SKU-103", "Gula Pasir Kristal 1KG", "Groceries", 18500),
        ("SKU-104", "Susu UHT Cokelat 1L", "Groceries", 21000),
        ("SKU-105", "Kopi Bubuk Arabika 250g", "Groceries", 45000),
        ("SKU-201", "Smart LED Bulb 10W", "Home & Living", 65000),
        ("SKU-202", "Panci Stainless Steel 24cm", "Home & Living", 145000),
        ("SKU-203", "Pisau Dapur Set 5-in-1", "Home & Living", 95000),
        ("SKU-301", "Kaos Polos Cotton Combed", "Apparel", 55000),
        ("SKU-302", "Kemeja Formal Oxford", "Apparel", 165000),
    ]
    write_csv(ret_dir / "products.csv", ["sku", "product_name", "category", "retail_price_idr"], products_rows)

    # 3. Inventory
    inventory_rows = []
    sup_ids = [s[0] for s in suppliers_rows]
    locations = ["Shelf A-01", "Shelf A-02", "Shelf B-01", "Shelf B-02", "Shelf C-01", "Cold Storage 1"]
    for i, p in enumerate(products_rows):
        stock = random.randint(15, 250)
        reorder = random.randint(30, 60)
        cost = int(p[3] * 0.75)
        inventory_rows.append([
            f"INV-{i+1:03d}", p[0], random.choice(sup_ids), random.choice(locations), stock, reorder, cost, "Normal" if stock > reorder else "RESTOCK_NEEDED"
        ])
    write_csv(ret_dir / "inventory.csv", ["inventory_id", "sku", "supplier_id", "warehouse_shelf", "current_stock", "reorder_point", "unit_cost_idr", "stock_status"], inventory_rows)

def generate_hospitality():
    hotel_dir = DATASET_DIR / "Hospitality" / "hotel"
    
    # 1. Rooms
    rooms_rows = [
        ("RM-101", "101", "Standard Double", "Kuta Resort Bali", 650000, 1),
        ("RM-102", "102", "Standard Twin", "Kuta Resort Bali", 650000, 1),
        ("RM-201", "201", "Deluxe Ocean View", "Kuta Resort Bali", 1100000, 2),
        ("RM-202", "202", "Deluxe Ocean View", "Kuta Resort Bali", 1100000, 2),
        ("RM-301", "301", "Executive Suite", "Kuta Resort Bali", 2400000, 3),
        ("RM-401", "101", "Superior City View", "Grand Thamrin Jakarta", 850000, 4),
        ("RM-402", "102", "Superior King", "Grand Thamrin Jakarta", 900000, 4),
        ("RM-501", "201", "Junior Suite", "Grand Thamrin Jakarta", 1650000, 5),
    ]
    write_csv(hotel_dir / "rooms.csv", ["room_id", "room_number", "room_type", "branch_name", "price_per_night_idr", "floor"], rooms_rows)

    # 2. Guests
    guests_rows = []
    countries = ["Indonesia", "Australia", "Singapore", "Malaysia", "Japan", "Germany", "United Kingdom"]
    for i in range(1, 41):
        gid = f"GST-{i:03d}"
        guests_rows.append([
            gid, f"Guest {i:03d}", f"guest{i:03d}@example.com", random.choice(countries), random.randint(100, 3500)
        ])
    write_csv(hotel_dir / "guests.csv", ["guest_id", "full_name", "email", "nationality", "loyalty_points"], guests_rows)

    # 3. Bookings
    bookings_rows = []
    channels = ["Direct Website", "Booking.com", "Traveloka", "Agoda", "Walk-in"]
    statuses = ["Checked Out", "Confirmed", "Cancelled"]
    r_ids = [r[0] for r in rooms_rows]
    for i in range(1, 65):
        bid = f"BKG-2026{i:03d}"
        gid = random.choice(guests_rows)[0]
        rid = random.choice(r_ids)
        nights = random.randint(1, 5)
        price_per_night = next(r[4] for r in rooms_rows if r[0] == rid)
        total = nights * price_per_night
        bookings_rows.append([
            bid, gid, rid, f"2026-02-{random.randint(1,20):02d}", nights, total, random.choice(channels), random.choice(statuses)
        ])
    write_csv(hotel_dir / "bookings.csv", ["booking_id", "guest_id", "room_id", "checkin_date", "nights_stayed", "total_price_idr", "booking_channel", "booking_status"], bookings_rows)

def generate_saas():
    saas_dir = DATASET_DIR / "SaaS" / "subscriptions"
    
    # 1. Plans
    plans_rows = [
        ("PLAN-01", "Starter Tier", 49, 5, "Small Team"),
        ("PLAN-02", "Growth Tier", 149, 20, "Scaling Startup"),
        ("PLAN-03", "Professional Tier", 299, 50, "Mid-Market"),
        ("PLAN-04", "Enterprise Tier", 799, 200, "Enterprise Full"),
    ]
    write_csv(saas_dir / "plans.csv", ["plan_id", "plan_name", "monthly_price_usd", "seat_limit", "target_audience"], plans_rows)

    # 2. Subscriptions
    subs_rows = []
    p_ids = [p[0] for p in plans_rows]
    statuses = ["Active", "Trial", "Past Due", "Cancelled"]
    for i in range(1, 51):
        sid = f"SUB-{i:03d}"
        pid = random.choice(p_ids)
        subs_rows.append([
            sid, f"Company {i:03d} Tech", pid, random.randint(3, 85),
            f"2025-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            f"2026-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            random.choice(statuses)
        ])
    write_csv(saas_dir / "subscriptions.csv", ["subscription_id", "company_name", "plan_id", "seats_purchased", "start_date", "renewal_date", "status"], subs_rows)

    # 3. Invoices
    invoices_rows = []
    for i in range(1, 65):
        inv_id = f"INV-2026{i:03d}"
        sub = random.choice(subs_rows)
        plan_price = next(p[2] for p in plans_rows if p[0] == sub[2])
        invoices_rows.append([
            inv_id, sub[0], f"2026-02-{random.randint(1,28):02d}", plan_price, "PAID" if random.random() > 0.1 else "PENDING"
        ])
    write_csv(saas_dir / "invoices.csv", ["invoice_id", "subscription_id", "invoice_date", "amount_usd", "payment_status"], invoices_rows)

def generate_telecom():
    tel_dir = DATASET_DIR / "Telecommunications" / "churn"
    
    # 1. Services
    services_rows = [
        ("SRV-01", "Fiber Ultra 100Mbps", "Fiber Internet", 350000),
        ("SRV-02", "Fiber Ultra 300Mbps", "Fiber Internet", 650000),
        ("SRV-03", "IPTV Entertainment HD", "TV Addon", 150000),
        ("SRV-04", "Static IP Dedicated", "Business Addon", 200000),
        ("SRV-05", "Cloud Backup 1TB", "Storage Addon", 75000),
    ]
    write_csv(tel_dir / "services.csv", ["service_id", "service_name", "category", "monthly_fee_idr"], services_rows)

    # 2. Customers
    cust_rows = []
    for i in range(1, 51):
        cid = f"TEL-{i:04d}"
        cust_rows.append([
            cid, f"Subscriber {i:03d}", random.choice(["Male", "Female"]),
            random.choice(["Jakarta", "Surabaya", "Bandung", "Medan"]),
            f"202{random.randint(2,5)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        ])
    write_csv(tel_dir / "customers.csv", ["customer_id", "customer_name", "gender", "city", "join_date"], cust_rows)

    # 3. Churn records
    contracts = ["Month-to-Month", "One Year Contract", "Two Year Contract"]
    churn_rows = []
    for c in cust_rows:
        cid = c[0]
        tenure = random.randint(1, 48)
        charge = random.randint(350000, 1100000)
        contract = random.choice(contracts)
        churned = "YES" if (contract == "Month-to-Month" and random.random() < 0.45) else "NO"
        risk = round(random.uniform(0.1, 0.95), 2)
        churn_rows.append([
            f"REC-{cid}", cid, contract, charge, tenure, churned, risk
        ])
    write_csv(tel_dir / "churn_records.csv", ["record_id", "customer_id", "contract_type", "monthly_charges_idr", "tenure_months", "has_churned", "churn_risk_score"], churn_rows)

if __name__ == "__main__":
    print("Generating hierarchical multi-table datasets...")
    generate_e_commerce()
    generate_fintech()
    generate_healthcare()
    generate_hr()
    generate_logistics()
    generate_education()
    generate_retail()
    generate_hospitality()
    generate_saas()
    generate_telecom()
    print("All datasets generated successfully!")
