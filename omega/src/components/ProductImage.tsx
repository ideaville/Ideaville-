import { copy } from '../lib/copy'
import './ProductImage.css'

type Props = {
  src?: string | null
  ratio?: '4-5' | '1-1' | 'thumb'
  width: number
  height: number
  lazy?: boolean
}

export function ProductImage({ src, ratio = '1-1', width, height, lazy = false }: Props) {
  if (!src) {
    return (
      <div className={`product-image product-image-${ratio} product-image-empty`} data-testid="product-image" role="img" aria-label={copy.noImage}>
        <span>{copy.noImage}</span>
      </div>
    )
  }

  return (
    <div className={`product-image product-image-${ratio}`}>
      <img
        src={src}
        alt={copy.conceptAlt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        data-testid="product-image"
      />
      <span className="concept-tag">Concept</span>
    </div>
  )
}
