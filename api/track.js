<script>
  (function() {
    class OrderTracking{{ ai_gen_id }} extends HTMLElement {
      constructor() {
        super();
        this.form = this.querySelector('[data-tracking-form]');
        this.messageEl = this.querySelector('[data-message]');
        
        // PASTE YOUR VERCEL DOMAIN HERE:
        this.VERCEL_API_URL = 'https://iblazevape-tracking.vercel.app/api/track';
      }

      connectedCallback() {
        if (this.form) {
          this.form.addEventListener('submit', this.handleSubmit.bind(this));
        }
      }

      async handleSubmit(event) {
        event.preventDefault();
        
        const orderInput = this.form.querySelector('[name="order_number"]').value.trim();
        const emailInput = this.form.querySelector('[name="email"]').value.trim();
        
        const orderNumber = orderInput.replace('#', '');
        const email = encodeURIComponent(emailInput);
        
        this.hideMessage();
        this.showMessage('Verifying credentials via secure server...', 'success');

        try {
          // 1. Ask Vercel for the secure URL
          const response = await fetch(`${this.VERCEL_API_URL}?order=${orderNumber}&email=${email}`);
          const data = await response.json();

          if (response.ok && data.success) {
            this.showMessage('Order verified! Redirecting to tracking portal...', 'success');
            // 2. Drop the guest directly on the specific tracking map
            setTimeout(() => {
              window.location.href = data.url;
            }, 800);
          } else {
            // Error from Vercel (e.g., wrong email or order not found)
            this.showMessage(data.error || 'Failed to locate order details.', 'error');
          }
        } catch (error) {
          this.showMessage('Connection error. Please try again later.', 'error');
        }
      }

      showMessage(text, type) {
        this.messageEl.textContent = text;
        this.messageEl.className = `ai-order-tracking-message-{{ ai_gen_id }} ${type} show`;
      }

      hideMessage() {
        this.messageEl.classList.remove('show');
      }
    }

    customElements.define('order-tracking-{{ ai_gen_id }}', OrderTracking{{ ai_gen_id }});
  })();
</script>
