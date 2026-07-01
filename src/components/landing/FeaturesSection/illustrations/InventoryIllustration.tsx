import { motion, useReducedMotion } from 'framer-motion';

const PRODUCTS = [
  { name: 'Tomatoes', stock: 82, low: false },
  { name: 'Olive Oil', stock: 24, low: true },
  { name: 'Basil', stock: 56, low: false },
];

export function InventoryIllustration() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="relative mx-auto max-w-[280px]"
      animate={reducedMotion ? undefined : { y: [0, -3, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="space-y-2">
        {PRODUCTS.map((product, i) => (
          <motion.div
            key={product.name}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`rounded-xl border border-slate-100 bg-white p-3 shadow-sm ${
              i === 0 ? 'ml-0' : i === 1 ? 'ml-2' : 'ml-4'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800">{product.name}</span>
              {product.low && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Low stock
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`h-full rounded-full ${product.low ? 'bg-amber-400' : 'bg-[#0F8F68]'}`}
                initial={reducedMotion ? undefined : { width: 0 }}
                whileInView={{ width: `${product.stock}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="absolute -bottom-1 right-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-[#0F8F68]"
      >
        Replenish
      </motion.div>
    </motion.div>
  );
}
