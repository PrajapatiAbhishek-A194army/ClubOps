import React from 'react';
import RootLayout from './layouts/RootLayout';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <RootLayout>
      <AppRoutes />
    </RootLayout>
  );
}
