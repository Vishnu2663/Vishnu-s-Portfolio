
'use client';

import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobile = Boolean(
      /android|blackberry|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(userAgent)
    );
    setIsMobile(mobile);
  }, []);

  return isMobile;
}
