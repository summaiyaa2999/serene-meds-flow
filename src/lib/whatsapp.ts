export const openWhatsApp = (phoneNumber: string, message: string = "") => {
  // Sanitize phone number: remove +, spaces, dashes, parentheses
  const rawDigits = (phoneNumber || "").replace(/[^0-9]/g, "");
  const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits || "917078718575";
  const encodedText = encodeURIComponent(message);

  // Detect mobile device (Android, iPhone, iPad, iPod, webOS, etc.)
  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Direct mobile deep link (triggers native app directly on iOS/Android)
    window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    // Desktop fallback to Web WhatsApp
    window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`, "_blank");
  }
};
