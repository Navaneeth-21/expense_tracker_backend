// src/controllers/dashboardController.js
const pool = require('../config/db');
const { fixedProperties } = require('../data/properties'); // Import fixed properties


exports.getFinancialOverview = async (req, res) => {
  try {
    const { property } = req.query;
    const userId = req.user.user_id;

    let query = `
      SELECT 
        COALESCE(SUM(CASE WHEN c.name = 'Revenue' THEN e.amount ELSE 0 END), 0) AS totalRevenue,
        COALESCE(SUM(CASE WHEN c.name != 'Revenue' THEN -e.amount ELSE 0 END), 0) AS totalExpenses,
        COALESCE(
          SUM(CASE WHEN c.name = 'Revenue' THEN e.amount ELSE 0 END) - 
          SUM(CASE WHEN c.name != 'Revenue' THEN -e.amount ELSE 0 END), 
          0
        ) AS netProfit,
        COALESCE(SUM(CASE WHEN c.name IN ('Salaries', 'Staff Salaries') THEN -e.amount ELSE 0 END), 0) AS staffExpenses
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = $1
    `;
    const params = [userId];

    if (property && property !== 'All Properties') {
      query += ` AND e.description LIKE $2`;
      params.push(`%${property}%`);
    }

    const result = await pool.query(query, params);
    const data = result.rows[0];
    // console.log('Financial overview data:', data); // debugging line

    res.json({
      totalRevenue: Number(data.totalrevenue) || 0,
      totalExpenses: Number(data.totalexpenses) || 0,
      netProfit: Number(data.netprofit) || 0,
      staffExpenses: Number(data.staffexpenses) || 0,
    });
  } catch (error) {
    console.error('Error in getFinancialOverview:', error);
    res.status(500).json({ error: 'Failed to fetch financial overview' });
  }
};

exports.getRecentTransactions = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { property } = req.query;

    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          CASE 
            WHEN e.amount > 0 THEN 'revenue'
            ELSE 'expense'
          END AS type,
          c.name AS category,
          p.method AS method,
          e.amount,
          TO_CHAR(e.created_at, 'YYYY-MM-DD HH24:MI') AS time
        FROM expenses e
        JOIN categories c ON e.category_id = c.category_id
        LEFT JOIN payments p ON e.expense_id = p.expense_id
        WHERE e.user_id = $1
      `;
      const values = [userId];

      if (property && property !== 'All Properties') {
        query += ` AND e.description LIKE $2`;
        values.push(`%${property}%`);
      }

      query += ` ORDER BY e.created_at DESC LIMIT 5`;

      const result = await client.query(query, values);

      const transactions = result.rows.map(row => ({
        type: row.type,
        category: row.category,
        method: row.method || 'Unknown',
        amount: parseFloat(row.amount),
        time: row.time,
      }));

      res.json(transactions);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    res.status(500).json({ error: "Failed to fetch recent transactions" });
  }
};

exports.getExpenseCategories = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { property } = req.query;

    let query = `
      SELECT 
        c.name AS category,
        SUM(e.amount) AS amount
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = $1 AND c.name != 'Revenue'
    `;
    const params = [userId];

    if (property && property !== 'All Properties' && typeof property === 'string') {
      const validProperty = fixedProperties.find(p => p.name === property);
      if (!validProperty) return res.status(400).json({ error: 'Invalid property name' });
      query += ` AND e.description LIKE $2`;
      params.push(`%${property}%`);
    }

    query += `
      GROUP BY c.name
      ORDER BY amount DESC
    `;

    const result = await pool.query(query, params);
    // Use absolute values for totalExpenses
    const totalExpenses = result.rows.reduce((sum, row) => sum + Math.abs(Number(row.amount)), 0);
    const categories = result.rows.map(row => {
      const amount = Math.abs(Number(row.amount));
      return {
        category: row.category,
        amount: amount,
        percentage: totalExpenses ? (amount / totalExpenses * 100).toFixed(1) : 0,
      };
    });

    res.json(categories);
  } catch (error) {
    console.error('Error in getExpenseCategories:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
};

exports.getMonthlyAnalytics = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { property, year } = req.query;

    // Log incoming query params for debugging
    // console.log('getMonthlyAnalytics query params:', { property, year }); debugging line

    let query = `
      SELECT 
        EXTRACT(MONTH FROM e.expense_date) AS month,
        EXTRACT(YEAR FROM e.expense_date) AS year,
        COALESCE(SUM(CASE WHEN c.name = 'Revenue' THEN e.amount ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN c.name != 'Revenue' THEN -e.amount ELSE 0 END), 0) AS expenses
      FROM expenses e
      JOIN categories c ON e.category_id = c.category_id
      WHERE e.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    // Property filter
    if (property && property !== 'All Properties' && typeof property === 'string') {
      const validProperty = fixedProperties.find(p => p.name === property);
      if (!validProperty) {
        return res.status(400).json({ error: 'Invalid property name' });
      }
      query += ` AND e.description LIKE $${paramIndex}`;
      params.push(`%${property}%`);
      paramIndex++;
    }

    // Year filter
    if (year && typeof year === 'string') {
      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear)) {
        return res.status(400).json({ error: 'Invalid year' });
      }
      query += ` AND EXTRACT(YEAR FROM e.expense_date) = $${paramIndex}`;
      params.push(parsedYear);
    } else {
      query += ` AND EXTRACT(YEAR FROM e.expense_date) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)`;
    }

    query += `
      GROUP BY EXTRACT(MONTH FROM e.expense_date), EXTRACT(YEAR FROM e.expense_date)
      ORDER BY year, month
    `;

    // Log the final query and params for debugging
    // console.log('Executing query:', query);  // debugging line
    // console.log('With params:', params); // debugging line

    const result = await pool.query(query, params);

    const monthlyData = result.rows.map(row => ({
      month: parseInt(row.month, 10),
      year: parseInt(row.year, 10),
      revenue: Number(row.revenue) || 0,
      expenses: Number(row.expenses) || 0,
      profit: (Number(row.revenue) || 0) + (Number(row.expenses) || 0),
    }));

    const selectedYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const fullYearData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const existing = monthlyData.find(d => d.month === month);
      return existing || { month, year: selectedYear, revenue: 0, expenses: 0, profit: 0 };
    });

    res.json(fullYearData);
  } catch (error) {
    console.error('Error in getMonthlyAnalytics:', error);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
};


exports.getProperties = async (req, res) => {
  try {
    const propertyNames = fixedProperties.map(p => p.name);
    res.json(['All Properties', ...propertyNames]);
  } catch (error) {
    console.error('Error in getProperties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
};