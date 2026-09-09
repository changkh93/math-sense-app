// Parse and validate large embedded assets outside the editor's UI thread.
function importRequest(request) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./projectImport.worker.js', import.meta.url), { type: 'module' })
    const finish = (error, project) => {
      clearTimeout(timeout); worker.terminate()
      if (error) reject(error)
      else resolve(project)
    }
    const timeout = setTimeout(() => finish(new Error('파일을 읽는 시간이 너무 오래 걸립니다. 파일을 다시 선택해 주세요.')), 20000)
    worker.onmessage = ({ data }) => finish(data.ok ? null : new Error(data.message), data)
    worker.onerror = () => finish(new Error('프로젝트 파일을 처리하지 못했습니다. 새로고침 후 다시 시도해 주세요.'))
    worker.postMessage(request)
  })
}

export async function importProjectFile(file) {
  return (await importRequest({ mode: 'backup', file })).project
}
export function importProjectFolder(files) {
  return importRequest({ mode: 'folder', files: files.map(file => ({ file, relativePath: file.webkitRelativePath })) })
}
