import React from 'react';
import { KDSBoard } from '../components/KDSBoard';

const KDSBar: React.FC = () => {
  return (
    <KDSBoard 
      station="BAR" 
      title="KDS - Quầy Bar" 
      description="Màn hình điều phối các món đồ uống"
      lateThresholdMins={10}
    />
  );
};

export default KDSBar;
