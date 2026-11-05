import React from 'react';
import { Product } from '../types';

interface BarcodeCardProps {
  product: Product;
  onPrint?: () => void;
}

export const BarcodeCard: React.FC<BarcodeCardProps> = ({ product }) => {
  // Generate deterministic barcode line patterns from barcode string
  const generateBars = (code: string) => {
    const bars: { width: number; isBlack: boolean }[] = [];
    // Start guard
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = (hash << 5) - hash + code.charCodeAt(i);
      hash |= 0;
    }

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const digit = parseInt(code[i], 10) || 5;
      const w1 = (digit % 3) + 1;
      const w2 = ((charCode + i) % 3) + 1;
      const w3 = ((Math.abs(hash) + i) % 2) + 1;

      bars.push({ width: w1 * 1.5, isBlack: false });
      bars.push({ width: w2 * 1.5, isBlack: true });
      bars.push({ width: w3 * 1.5, isBlack: false });
      bars.push({ width: 2, isBlack: true });
    }

    // Stop guard
    bars.push({ width: 2, isBlack: true });
    bars.push({ width: 2, isBlack: false });
    bars.push({ width: 2, isBlack: true });

    return bars;
  };

  const bars = generateBars(product.barcode);

  return (
    <div className="bg-white text-neutral-900 p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col items-center select-all">
      <div className="w-full text-center">
        <p className="text-xs font-semibold truncate max-w-[220px] mx-auto text-neutral-900">
          {product.name}
        </p>
        <p className="text-[11px] text-neutral-600 font-mono mt-0.5">
          Rp {product.sellPrice.toLocaleString('id-ID')} / {product.unit}
        </p>
      </div>

      {/* Barcode SVG illustration */}
      <div className="my-2 p-1 bg-white flex items-center justify-center">
        <svg
          height="54"
          className="w-full max-w-[210px]"
          viewBox="0 0 180 50"
          preserveAspectRatio="none"
        >
          {(() => {
            let currentX = 0;
            return bars.map((bar, idx) => {
              const x = currentX;
              currentX += bar.width;
              if (!bar.isBlack) return null;
              return (
                <rect
                  key={idx}
                  x={x}
                  y="0"
                  width={bar.width}
                  height="45"
                  fill="#000000"
                />
              );
            });
          })()}
        </svg>
      </div>

      <span className="font-mono text-xs tracking-widest text-neutral-800 font-medium">
        {product.barcode}
      </span>
    </div>
  );
};
