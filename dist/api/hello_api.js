/* /dist/api/hello_api.js */
(function () {
    // Expose a global so you can call it from inline HTML onclick=
    window.sayHelloFromApi = function () {
      // Do whatever you want here (start simple)
      notify("Color Function!");
  
      // If you want to do more “plugin-like” actions, put them here.
      // Example (only if addPlugin exists in your app):
      // if (typeof addPlugin === "function") {
      //   addPlugin("say_hello_plugin", "console.log('SayHello plugin ran')");
      // }
    };
  })();
  