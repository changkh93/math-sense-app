// Resolve a public route before replacing its already-rendered HTML.
// The resolved component is synchronous, unlike the first render of React.lazy.
export function createRouteModule(importer) {
  let component;
  let pending;
  return {
    getComponent: () => component,
    load: () => pending ||= importer().then(module => {
      component = module.default;
      return module;
    }).catch(error => {
      pending = undefined;
      throw error;
    }),
  };
}
