import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { captureSystemError } from '@/lib/captureError';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
	queryCache: new QueryCache({
		onError: (error, query) => {
			if (query?.state?.data !== undefined) return; // only capture first load failures
			captureSystemError(error, {
				source: 'query',
				queryKey: query?.queryKey?.slice(0, 3),
			});
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			captureSystemError(error, {
				source: 'mutation',
				mutationKey: mutation?.options?.mutationKey?.slice(0, 3),
			});
		},
	}),
});