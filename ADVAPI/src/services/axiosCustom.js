/**
 * Custom Axios implementation for the packaged application
 * to avoid issues with dynamic requires
 */
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const url = require('url');

class AxiosCustom {
  constructor() {
    this.defaults = {
      headers: {
        common: {
          'Accept': 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      }
    };
  }

  /**
   * Main request method 
   */
  request(config) {
    return this._request(config);
  }

  /**
   * GET method
   */
  get(url, config = {}) {
    return this._request({ ...config, method: 'GET', url });
  }

  /**
   * POST method
   */
  post(url, data, config = {}) {
    // Special handling for form-urlencoded data
    if (config.headers && config.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
      if (data instanceof URLSearchParams) {
        return this._request({ 
          ...config, 
          method: 'POST', 
          url, 
          data: data.toString() 
        });
      }
    }
    return this._request({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT method
   */
  put(url, data, config = {}) {
    return this._request({ ...config, method: 'PUT', url, data });
  }

  /**
   * Internal request implementation
   */
  _request(config) {
    return new Promise((resolve, reject) => {
      // Parse URL
      const parsedUrl = url.parse(config.url);
      
      // Determine protocol
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      // Prepare headers
      const headers = {
        ...this.defaults.headers.common,
        ...(config.headers || {})
      };
      
      // Handle data
      let data = null;
      if (config.data) {
        // Handle Buffer (binary data) directly
        if (Buffer.isBuffer(config.data)) {
          data = config.data;
          headers['Content-Length'] = config.data.length;
          // Don't override Content-Type if it's already set in headers
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/octet-stream';
          }
        } 
        // Handle objects (convert to JSON)
        else if (typeof config.data === 'object' && !Buffer.isBuffer(config.data)) {
          data = JSON.stringify(config.data);
          // Don't override Content-Type if it's already set in headers
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
          headers['Content-Length'] = Buffer.byteLength(data);
        } 
        // Handle strings
        else if (typeof config.data === 'string') {
          data = config.data;
          headers['Content-Length'] = Buffer.byteLength(data);
        }
      }
      
      // Prepare request options
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.path,
        method: config.method || 'GET',
        headers: headers
      };
      
      // Create request
      const req = httpModule.request(options, (res) => {
        let responseData = '';
        
        // Handle response data
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        // Handle response end
        res.on('end', () => {
          let parsedData;
          try {
            // Try to parse JSON if response is JSON
            if (res.headers['content-type']?.includes('application/json')) {
              parsedData = JSON.parse(responseData);
            } else {
              parsedData = responseData;
            }
            
            // Create response object similar to axios
            const response = {
              data: parsedData,
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: res.headers,
              config: config
            };
            
            // Resolve or reject based on status code
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject({
                response,
                message: `Request failed with status code ${res.statusCode}`
              });
            }
          } catch (e) {
            reject({
              message: 'Error parsing response data',
              error: e
            });
          }
        });
      });
      
      // Handle request errors
      req.on('error', (error) => {
        reject({
          message: 'Network Error',
          error: error
        });
      });
      
      // Send data if applicable
      if (data) {
        if (Buffer.isBuffer(data)) {
          // Send binary data directly
          req.write(data);
        } else {
          // Send string data
          req.write(data);
        }
      }
      
      // End request
      req.end();
    });
  }
}

// Create instance
const axiosCustom = new AxiosCustom();

// Export as a drop-in replacement for axios
module.exports = axiosCustom;