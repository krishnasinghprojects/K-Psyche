const { spawn } = require('child_process');

/**
 * Python Executor Utility
 * Handles spawning and managing Python processes
 */
class PythonExecutor {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
  }

  /**
   * Execute Python script or command
   * @param {Array<string>} args - Arguments to pass to Python
   * @param {Object} options - Execution options
   * @param {number} options.timeout - Timeout in milliseconds
   * @returns {Promise<string>} stdout output
   */
  execute(args, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 60000; // Default 1 minute

      console.log(`[PythonExecutor] Executing: ${this.pythonPath} ${args.join(' ')}`);

      // Spawn Python process
      const pythonProcess = spawn(this.pythonPath, args);

      let stdoutData = '';
      let stderrData = '';
      let timeoutHandle = null;

      // Capture stdout
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      // Capture stderr (for logging, not errors)
      pythonProcess.stderr.on('data', (data) => {
        const message = data.toString();
        stderrData += message;
        
        // Log INFO and WARNING messages
        if (message.includes('INFO:') || message.includes('WARNING:')) {
          console.log(`[Python] ${message.trim()}`);
        }
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }

        if (code === 0) {
          const output = stdoutData.trim();
          if (output) {
            resolve(output);
          } else {
            reject(new Error('Python process returned empty output'));
          }
        } else {
          const errorMsg = this._extractErrorMessage(stderrData) || 
                          `Python process exited with code ${code}`;
          reject(new Error(errorMsg));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        reject(new Error(`Failed to start Python process: ${error.message}. Check PYTHON_PATH in .env`));
      });

      // Set timeout
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          pythonProcess.kill('SIGTERM');
          
          // Force kill if not terminated
          setTimeout(() => {
            if (!pythonProcess.killed) {
              pythonProcess.kill('SIGKILL');
            }
          }, 5000);

          reject(new Error(`Python process timeout (${timeout}ms exceeded)`));
        }, timeout);
      }
    });
  }

  /**
   * Extract meaningful error message from stderr
   * @private
   */
  _extractErrorMessage(stderr) {
    if (!stderr) return null;

    // Look for ERROR: prefix
    const errorMatch = stderr.match(/ERROR:\s*(.+)/);
    if (errorMatch) {
      return errorMatch[1].trim();
    }

    // Look for Python exceptions
    const exceptionMatch = stderr.match(/(\w+Error):\s*(.+)/);
    if (exceptionMatch) {
      return `${exceptionMatch[1]}: ${exceptionMatch[2].trim()}`;
    }

    // Return last non-empty line
    const lines = stderr.split('\n').filter(line => line.trim());
    return lines.length > 0 ? lines[lines.length - 1].trim() : null;
  }

  /**
   * Check if Python is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      await this.execute(['--version'], { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new PythonExecutor();
