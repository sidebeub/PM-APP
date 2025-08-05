/**
 * Service for accessing KBOM data from the database
 */

// Get the pool from dbService for consistency
const dbService = require('./dbService');

/**
 * Finds KBOM entries related to a model by matching title with filename
 * @param {string} fileName - The model filename to match against KBOM titles
 * @returns {Promise<Array>} - Array of matching KBOM records
 */
const findRelatedKboms = async (fileName) => {
  const pool = dbService.getPool();
  if (!pool) {
    console.warn('Database not connected, cannot find related KBOMs');
    return [];
  }
  
  try {
    // Extract just the part number without any extensions for better matching
    // This handles cases like "B2001480.iam.dwf" where we only want "B2001480"
    const partNumber = fileName.split('.')[0];

    console.log(`KBOM Debug: Searching for part number "${partNumber}" from filename "${fileName}"`);

    // Extract part number and query for matches using more specific patterns first
    let result = await pool.query(
      `SELECT * FROM kbom WHERE title ILIKE $1 OR title ILIKE $2 OR title ILIKE $3 ORDER BY customer, so`,
      [`${partNumber} %`, `% ${partNumber} %`, `${partNumber}`]
    );

    console.log(`KBOM Debug: Found ${result.rows.length} matches for "${partNumber}"`);
    if (result.rows.length > 0) {
      console.log('KBOM Debug: First match columns:', Object.keys(result.rows[0]));
      console.log('KBOM Debug: First match data:', result.rows[0]);
    }
    
    // If no results, try a more general pattern
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT * FROM kbom WHERE title ILIKE $1 ORDER BY customer, so`,
        [`%${partNumber}%`]
      );
    }
    
    return result.rows;
  } catch (error) {
    console.error('Error finding related KBOMs:', error);
    return [];
  }
};

/**
 * Get KBOM by ID
 * @param {string} id - The KBOM ID to find
 * @returns {Promise<Object|null>} - The KBOM record or null if not found
 */
const getKbomById = async (id) => {
  const pool = dbService.getPool();
  if (!pool) {
    console.warn('Database not connected, cannot get KBOM');
    return null;
  }
  
  try {
    const result = await pool.query('SELECT * FROM kbom WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting KBOM by ID:', error);
    return null;
  }
};

/**
 * Get all unique customers from KBOM table
 * @returns {Promise<Array>} - Array of unique customer names
 */
const getAllCustomers = async () => {
  const pool = dbService.getPool();
  if (!pool) {
    console.warn('Database not connected, cannot get customers');
    return [];
  }
  
  try {
    const result = await pool.query(
      'SELECT DISTINCT customer FROM kbom ORDER BY customer'
    );
    return result.rows.map(row => row.customer);
  } catch (error) {
    console.error('Error getting all customers:', error);
    return [];
  }
};

/**
 * Get all sales orders for a specific customer
 * @param {string} customer - The customer name
 * @returns {Promise<Array>} - Array of sales order numbers
 */
const getSalesOrdersByCustomer = async (customer) => {
  const pool = dbService.getPool();
  if (!pool) {
    console.warn('Database not connected, cannot get sales orders');
    return [];
  }
  
  try {
    const result = await pool.query(
      'SELECT DISTINCT so FROM kbom WHERE customer = $1 ORDER BY so',
      [customer]
    );
    return result.rows.map(row => row.so);
  } catch (error) {
    console.error('Error getting sales orders by customer:', error);
    return [];
  }
};

/**
 * Get KBOMs by customer and sales order
 * @param {string} customer - The customer name
 * @param {string} so - The sales order number
 * @returns {Promise<Array>} - Array of KBOM records
 */
const getKbomsByCustomerAndSO = async (customer, so) => {
  const pool = dbService.getPool();
  if (!pool) {
    console.warn('Database not connected, cannot get KBOMs');
    return [];
  }
  
  try {
    const result = await pool.query(
      'SELECT * FROM kbom WHERE customer = $1 AND so = $2 ORDER BY title',
      [customer, so]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting KBOMs by customer and SO:', error);
    return [];
  }
};

/**
 * Check if the kbom table exists
 * @returns {Promise<boolean>} - True if the table exists, false otherwise
 */
const checkKbomTableExists = async () => {
  const pool = dbService.getPool();
  if (!pool) {
    console.warn('Database not connected, cannot check kbom table');
    return false;
  }
  
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'kbom'
      );
    `);
    
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error checking kbom table existence:', error);
    return false;
  }
};

module.exports = {
  findRelatedKboms,
  getKbomById,
  getAllCustomers,
  getSalesOrdersByCustomer,
  getKbomsByCustomerAndSO,
  checkKbomTableExists
};