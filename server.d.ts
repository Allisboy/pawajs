export const isServer: () => boolean;
export const getServerInstance: () => {
    useInsert: null;
    useInnerContext: null;
    setContext: null;
    useContext: null;
    $state: null;
    accessChild: null;
    useServer: null;
    useAsync: null;
    forwardPops: null;
};
export const setServer: (obj?: {}) => void;
