declare module 'monaco-editor/esm/vs/editor/editor.api' {
  export * from 'monaco-editor';
}

declare module 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';

declare module '*?worker' {
  const WorkerCtor: { new (): Worker };
  export default WorkerCtor;
}

declare module '*?worker&url' {
  const workerUrl: string;
  export default workerUrl;
}
