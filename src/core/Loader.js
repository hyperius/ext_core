/**
 * @class Ext.Loader
 * @singleton
 * Simple class to help load JavaScript files on demand
 */
Ext.Loader = Ext.apply({}, {
    /**
     * Loads a given set of .js files. Calls the callback function when all files have been loaded
     * Set preserveOrder to true to ensure non-parallel loading of files if load order is important
     * @param {Array} fileList Array of all files to load
     * @param {Function} callback Callback to call after all files have been loaded
     * @param {Object} scope The scope to call the callback in
     * @param {Boolean} preserveOrder True to make files load in serial, one after the other (defaults to false)
     */
    load: function(fileList, callback, scope, preserveOrder) {
        var scope       = scope || this,
            head        = document.getElementsByTagName("head")[0],
            fragment    = document.createDocumentFragment(),
            numFiles    = fileList.length,
            loadedFiles = 0,
            me          = this;
        
        /**
         * Loads a particular file from the fileList by index. This is used when preserving order
         */
        var loadFileIndex = function(index) {
            head.appendChild(
                me.buildScriptTag(fileList[index], onFileLoaded)
            );
        };
        
        /**
         * Callback function which is called after each file has been loaded. This calls the callback
         * passed to load once the final file in the fileList has been loaded
         */
        var onFileLoaded = function() {
            loadedFiles ++;
            
            //if this was the last file, call the callback, otherwise load the next file
            if (numFiles == loadedFiles && typeof callback == 'function') {
                callback.call(scope);
            } else {
                if (preserveOrder === true) {
                    loadFileIndex(loadedFiles);
                }
            }
        };
        
        if (preserveOrder === true) {
            loadFileIndex.call(this, 0);
        } else {
            //load each file (most browsers will do this in parallel)
            Ext.each(fileList, function(file, index) {
                fragment.appendChild(
                    this.buildScriptTag(file, onFileLoaded)
                );  
            }, this);
            
            head.appendChild(fragment);
        }
    },
    
    /**
     * @private
     * Creates and returns a script tag, but does not place it into the document. If a callback function
     * is passed, this is called when the script has been loaded
     * @param {String} filename The name of the file to create a script tag for
     * @param {Function} callback Optional callback, which is called when the script has been loaded
     * @return {Element} The new script ta
     */
    buildScriptTag: function(filename, callback) {
        var script  = document.createElement('script');
        script.type = "text/javascript";
        script.src  = filename;
        
        //IE has a different way of handling &lt;script&gt; loads, so we need to check for it here
        if (script.readyState) {
            script.onreadystatechange = function() {
                if (script.readyState == "loaded" || script.readyState == "complete") {
                    script.onreadystatechange = null;
                    callback();
                }
            };
        } else {
            script.onload = callback;
        }    
        
        return script;
    }
});
