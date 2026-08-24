declare var __WFS_TEST__: any;
declare var __WFS_BLOB_AUDIT__: { created: number; revoked: number };

interface Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
}
