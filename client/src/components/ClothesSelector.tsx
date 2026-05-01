import React from 'react';
import { useAppContext } from '../context/AppContext';
import styles from './ClothesSelector.module.css';

interface ClothesSelectorProps {
  // 组件属性
}

export function ClothesSelector(_props: ClothesSelectorProps): JSX.Element {
  const { clothesList, currentClothes, setCurrentClothes } = useAppContext();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>选择衣服</h3>
      <div className={styles.list}>
        {clothesList.map((clothes) => (
          <div
            key={clothes.id}
            className={`${styles.item} ${currentClothes?.id === clothes.id ? styles.selected : ''}`}
            onClick={() => setCurrentClothes(clothes)}
            style={{ position: 'relative' }}
          >
            {currentClothes?.id === clothes.id && (
              <div className={styles.checkmark}>✓</div>
            )}
            <img
              src={clothes.imageUrl}
              alt={clothes.name}
              className={styles.itemImage}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <span className={styles.itemName}>{clothes.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
