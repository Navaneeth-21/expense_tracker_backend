// src/config/schemaInfo.js
const schemaInfo = `
Here is the database schema:
- categories(category_id, name)
- expenses(expense_id, user_id, category_id, amount, description, expense_date, created_at)
- payments(payment_id, expense_id, method)
- staff(staff_id, user_id, name, role, status, performance, transactions, last_active, recent_activity, email, phone, created_at)
- users(user_id, name, password_hash, created_at, email, accept_terms)

### Key Rules:

1. **User-Specific Data:**
   - Every financial query must include 'user_id = $1' to ensure each user only sees their own data.

2. **Income (Revenue) Handling:**
   - Revenue is stored in the "expenses" table under categories where 'name = 'Revenue'.
   - Revenue should always be a **positive** number.
   - Expenses should be stored as **negative** numbers.

3. **Net Profit Calculation:**
   - 'Net Profit = Total Revenue - Total Expenses'
   - Expenses are already negative, so no need to subtract a negative value.

4. **Transaction Filtering:**
   - Always filter transactions by 'user_id' before returning results.

5. **Payment Methods Standardization:**
   - Allowed values: 'Credit Card', 'Debit Card', 'Cash', 'Bank Transfer'.
   - Convert user input to standardized format.

6. **Category Mapping:**
   - Revenue → Income, Sales
   - Rent → Rent, Lease, Mortgage, Property Tax, Insurance
   - Staff Salaries → Staff salaries, worker salaries, labor salaries
   - Salaries → Employee salaries, wages, bonuses, commissions, benefits
   - Utilities → Groceries, Electricity, Water, Gas, Internet, Phone, Cleaning, Repairs, Maintenance, Waste, Recycling, Sewer, Heating, Cooling
   - Food & Beverages → Restaurants, Cafes, Bars, Snacks, Drinks, Alcohol, food, beverages, catering, takeout, delivery
   - Transportation → Fuel, Gas, Taxi, Public Transport, Parking, Tolls, Vehicle Maintenance, Repairs, Registration, Insurance
   - Health & Fitness → Gym, Fitness, Health, Medical, Insurance, Pharmacy, Doctor, Dentist, Therapist, Counseling
   - Technology & Gadgets → Electronics, Software, Computers, Mobile Phones, Gadgets, Hosting, Domains, laptops, tablets, accessories
   - Business Expenses → Office supplies, Marketing, Consulting

7. **Error Handling:**
   - Return **one valid SQL query** without unnecessary explanations.
   - Ensure all queries correctly reference 'user_id' for security.

8. **Secure Insertion Example:**
   - Before inserting an expense, ensure the category exists:
     '''sql
     INSERT INTO categories (name)
     VALUES ('Revenue')
     ON CONFLICT (name) DO NOTHING;
     '''
   - Retrieve 'category_id' and insert the expense securely:
     '''sql
     INSERT INTO expenses (user_id, category_id, amount, description, expense_date, created_at)
     VALUES ($1, (SELECT category_id FROM categories WHERE name = 'Revenue'), 3000, 'Income received', CURRENT_DATE, CURRENT_TIMESTAMP);
     '''
   - Insert payment method:
     '''sql
     INSERT INTO payments (expense_id, method)
     VALUES (LASTVAL(), 'Bank Transfer');
     '''
9. Consider bank as Bank Transfer, cash as Cash, credit card as Credit Card,  debit card as Debit Card and other payment methods as Other.
`;

module.exports = schemaInfo;
