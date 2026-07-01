import { useEffect, useRef, useState } from 'react';

type UseInViewOnceOptions = {
  threshold?: number;
  rootMargin?: string;
};

export function useInViewOnce<T extends Element>({
  threshold = 0.2,
  rootMargin = '0px 0px -40px 0px',
}: UseInViewOnceOptions = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, threshold, rootMargin]);

  return { ref, inView };
}
