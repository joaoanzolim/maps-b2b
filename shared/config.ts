// API Configuration
export const API_CONFIG = {
  // Base URLs
  WEBHOOK_BASE_URL: "https://autowebhook.hooks.digital/webhook",
  
  // Specific endpoints
  SEARCH_WEBHOOK_ID: "68770ab5-cdde-45f5-8bee-a419c2926423",
  DOWNLOAD_WEBHOOK_ID: "3a9d397e-ae0c-4dd8-812e-812e1b8382af",
  STATUS_UPDATE_WEBHOOK_ID: "68770ab5-cdde-45f5-8bee-a419c2926423",
  
  // Authorization
  BEARER_TOKEN: "kvsx8XlCnJuFWGfyD7IGPdLG9yh8OjGi",
  
  // Full URLs
  get SEARCH_URL() {
    return `${this.WEBHOOK_BASE_URL}/${this.SEARCH_WEBHOOK_ID}`;
  },
  
  get DOWNLOAD_URL() {
    return `${this.WEBHOOK_BASE_URL}/${this.DOWNLOAD_WEBHOOK_ID}`;
  },
  
  get STATUS_UPDATE_URL() {
    return `${this.WEBHOOK_BASE_URL}/${this.STATUS_UPDATE_WEBHOOK_ID}`;
  },
  
  // Headers
  get HEADERS() {
    return {
      "Authorization": `Bearer ${this.BEARER_TOKEN}`,
      "Content-Type": "application/json",
    };
  }
};