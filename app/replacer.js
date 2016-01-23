'use strict';

var fs = require('fs');
var readline = require('line-input-stream');
var exec = require('child_process').exec;
var execSync = require('sync-exec');
var args = process.argv.slice(2);
var colors = require('colors');
var os = require('os');
var path = require('path');
var verbose = false;
if (args[1] === 'verbose' || args[2] === 'verbose') {
  verbose = true;
}
var Replacer = module.exports = function Replacer(file, options) {
  var module = {},
          searches = [],
          seds = [],
          countLines = 0;
  /*
   * Add string for the replace
   * 
   * @param string search
   * @param string replace
   */
  module.add = function (search, replace) {
    searches.push({search: search, replace: replace});
  };

  /*
   * Remove the string with a blank line
   * 
   * @param string search
   */
  module.rm = function (search) {
    searches.push({search: "        " + search, replace: ''});
    searches.push({search: search, replace: ''});
  };

  /*
   * The rows for sed
   * 
   * @param number startok
   * @param number _end
   */
  module.addsed = function (startok, endok) {
    if (endok) {
      seds.push({start: startok, end: endok});
    } else {
      seds.push({start: startok});
    }
  };

  /*
   * Workaround count the line of a file
   * 
   * @param string file
   */
  module.getlines = function (file) {
    if (countLines === 0) {
      var wc = execSync("wc -l < " + process.cwd() + '/' + file);
      if (wc.stderr !== undefined) {
        console.log((wc.stderr).red);
      }
      countLines = parseInt(wc.stdout) - 1;
    }
  };

  module.file = file;

  //Base replacements
  module.add(/plugin-name/g, options.pluginSlug);
  module.add(/Plugin_Name_Admin/g, options.pluginClassName + '_Admin');
  module.add(/Plugin_Name/g, options.pluginClassName);
  module.add(/Plugin Name\./g, options.pluginName);
  module.add(/Plugin Name/g, options.pluginName);
  module.add(new RegExp(options.pluginName + ':', 'g'), 'Plugin Name:');
  module.add(/$plugin_name = 'Plugin Name';/g, '$plugin_name = ' + options.pluginName + '\';');
  module.add(/Plugin Name:( {7})@TODO/g, 'Plugin Name:       ' + options.pluginName);
  module.add(/Your Name <email@example\.com>/g, options.author + ' <' + options.authorEmail + '>');
  module.add(/1\.0\.0/g, options.pluginVersion);
  module.add(/Your Name or Company Name/g, options.pluginCopyright);
  module.add(new RegExp('http://example.com', 'g'), options.authorURI);
  module.add(/pn_/g, options.pluginName.match(/\b(\w)/g).join('').toLowerCase() + '_');
  module.add(/Pn_/g, options.pluginName.match(/\b(\w)/g).join('') + '_');
  module.add(/pn-/g, options.pluginName.match(/\b(\w)/g).join('').toLowerCase() + '-');

  /*
   * Replace the strings
   * 
   */
  module.replace = function () {
    file = module.file;
    var exists = fs.readFileSync(process.cwd() + '/' + file);
    if (exists) {
      var data = exists;
      data = data.toString();
      module.add(/\n\n\n/g, "\n");
      var i, total;

      total = searches.length;
      for (i = 0; i < total; i += 1) {
        data = data.replace(searches[i].search, searches[i].replace);
      }

      fs.writeFileSync(process.cwd() + '/' + file, data);
      if (verbose) {
        console.log(('Replace ' + file).italic);
      }
    } else {
      console.log(('File not exist: ' + file).red);
    }
  };

  /*
   * Add in sed blocks of rows
   * 
   * @param array block
   */
  module.looplines = function (block) {
    block.forEach(function (element, index, array) {
      if (1 in element) {
        module.addsed(element[0], element[1]);
      } else {
        module.addsed(element[0]);
      }
    });
  };

  /*
   * Call sed command and replace method
   */
  module.sed = function () {
    file = module.file;
    try {
      var exists = fs.readFileSync(process.cwd() + '/' + file);
      if (exists) {
        if (seds.length !== 0) {
          var total = seds.length;
          var line = '';
          var i;

          for (i = 0; i < total; i += 1) {
            if (typeof seds[i].end !== "undefined") {
              line += seds[i].start + ',' + seds[i].end + "d;";
            } else {
              line += seds[i].start + "d;";
            }
          }
          var sedcmd = "sed -i '" + line + "' " + process.cwd() + '/' + file;
          //Detect OSX for a compatible sed command
          if (os.platform() === 'darwin') {
            sedcmd = "sed -i '" + path.extname(file) + "' '" + line + "' " + process.cwd() + '/' + file.substr(0, file.lastIndexOf("."));
          }
          exec(sedcmd, {cwd: process.cwd() + '/'},
                  function (err, stdout, stderr) {
                    if (stderr.length > 0) {
                      console.log((sedcmd).red);
                      return console.log(('stderr: ' + stderr).red);
                    }
                    if (err !== null) {
                      return console.log(('exec error: ' + err).red);
                    }
                    if (verbose) {
                      console.log(('Sed ' + file).italic);
                    }
                    module.replace();
                  });
        } else {
          module.replace();
        }
      } else {
        console.log(('File not exist: ' + file).red);
      }
    } catch (err) {

    }
  };

  return module;
};
