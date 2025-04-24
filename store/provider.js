// store/provider.js
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import TopLoadingModal from '../components/Loader';

function StoreProvider({ children }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<TopLoadingModal message="Loading data..." />} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}

export default StoreProvider;
