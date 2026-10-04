import React from 'react';
import { KDSBoard } from '../components/KDSBoard';

const KDSKitchen: React.FC = () => {
  return (
    <KDSBoard 
      station="KITCHEN" 
      title="KDS - Bếp (Kitchen)" 
      description="Màn hình điều phối các món ăn"
      lateThresholdMins={15}
    />
  );
};

export default KDSKitchen;
