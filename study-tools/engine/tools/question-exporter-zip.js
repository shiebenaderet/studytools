// The ONLY file in this codebase that depends on JSZip.
// fileMap entries are string (treated as UTF-8) or Blob (binary).
// Returns a Promise<Blob> of the resulting .zip.
(function () {
  function packageZip(fileMap) {
    if (typeof JSZip !== 'function') {
      return Promise.reject(new Error('JSZip not loaded — include vendor/jszip.min.js before this script.'));
    }
    var zip = new JSZip();
    Object.keys(fileMap).forEach(function (path) {
      zip.file(path, fileMap[path]);
    });
    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
  if (typeof window !== 'undefined') window.QExportZip = { packageZip: packageZip };
})();
