import React, { useState, useEffect } from 'react';
import { CardItem } from '../types';
import { CardFallbackPlaceholder } from './CardFallbackPlaceholder';

interface CardImageWithFallbackProps {
  card: CardItem;
  src?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  variant?: 'card' | 'thumbnail' | 'modal';
  onStatusChange?: (status: 'loading' | 'loaded' | 'fallback') => void;
  onClick?: () => void;
}

export const CardImageWithFallback: React.FC<CardImageWithFallbackProps> = ({
  card,
  src,
  alt,
  className = '',
  imgClassName = '',
  variant = 'card',
  onStatusChange,
  onClick
}) => {
  const targetSrc = (src !== undefined ? src : card.imageUrl) || '';
  const [currentSrc, setCurrentSrc] = useState<string>(targetSrc);
  const [retryStage, setRetryStage] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(!targetSrc);

  // Sync state whenever the source URL changes
  useEffect(() => {
    const nextSrc = (src !== undefined ? src : card.imageUrl) || '';
    setCurrentSrc(nextSrc);
    setRetryStage(0);
    setHasError(!nextSrc);
    if (onStatusChange) {
      onStatusChange(nextSrc ? 'loading' : 'fallback');
    }
  }, [src, card.imageUrl]);

  const handleImageError = () => {
    if (!currentSrc) {
      setHasError(true);
      if (onStatusChange) onStatusChange('fallback');
      return;
    }

    // Stage 1: Try public image proxy / webp converter (wsrv.nl)
    if (retryStage === 0) {
      setRetryStage(1);
      if (!currentSrc.includes('wsrv.nl')) {
        const rawUrl = currentSrc.includes('/api/card-image-proxy?url=')
          ? decodeURIComponent(currentSrc.split('/api/card-image-proxy?url=')[1])
          : currentSrc;
        setCurrentSrc(`https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&output=webp`);
        return;
      } else {
        // If wsrv.nl failed, try our local server proxy
        const rawUrl = decodeURIComponent(currentSrc.split('url=')[1]?.split('&')[0] || currentSrc);
        setCurrentSrc(`/api/card-image-proxy?url=${encodeURIComponent(rawUrl)}`);
        return;
      }
    }

    // Stage 2: Try local server proxy with Bandai/Riot referer headers
    if (retryStage === 1) {
      setRetryStage(2);
      if (!currentSrc.includes('/api/card-image-proxy')) {
        const rawUrl = currentSrc.includes('wsrv.nl')
          ? decodeURIComponent(currentSrc.split('url=')[1]?.split('&')[0] || '')
          : currentSrc;
        if (rawUrl) {
          setCurrentSrc(`/api/card-image-proxy?url=${encodeURIComponent(rawUrl)}`);
          return;
        }
      }
    }

    // Stage 3: All network attempts failed -> gracefully activate the visual TCG placeholder
    setHasError(true);
    if (onStatusChange) onStatusChange('fallback');
  };

  const handleImageLoad = () => {
    setHasError(false);
    if (onStatusChange) onStatusChange('loaded');
  };

  if (hasError || !currentSrc) {
    return (
      <div className={`w-full h-full ${className}`} onClick={onClick}>
        <CardFallbackPlaceholder card={card} variant={variant} />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`} onClick={onClick}>
      <img
        src={currentSrc}
        alt={alt || card.name}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
          card.isFoil ? 'foil-shine' : ''
        } ${imgClassName}`}
      />
    </div>
  );
};
