import { createClient } from '@dynamic-labs/client';
import { useReactiveClient } from '@dynamic-labs/react-hooks';
import { ReactNativeExtension } from '@dynamic-labs/react-native-extension';
import { SolanaExtension } from '@dynamic-labs/solana-extension';

const dynamicId = '820af009-d126-43d5-be5e-4a69536592bf';

export const dynamicClient = createClient({
  environmentId: dynamicId || '',
}).extend(ReactNativeExtension({
  
}));
// .extend(SolanaExtension());

// Add this hook for using in components
export const useDynamic = () => useReactiveClient(dynamicClient);
