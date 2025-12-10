var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, dialog, screen, globalShortcut, BrowserWindow, Menu, nativeImage, Tray, shell } from "electron";
import { fileURLToPath as fileURLToPath$1 } from "node:url";
import path$3 from "node:path";
import path$2 from "path";
import fs from "fs";
import require$$1$1 from "util";
import require$$2$1 from "events";
import require$$0 from "child_process";
import require$$1 from "os";
import require$$2 from "stream";
import { createRequire } from "module";
import { fileURLToPath } from "url";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var utils$2 = { exports: {} };
var windows;
var hasRequiredWindows;
function requireWindows() {
  if (hasRequiredWindows) return windows;
  hasRequiredWindows = 1;
  windows = isexe2;
  isexe2.sync = sync2;
  var fs$1 = fs;
  function checkPathExt(path2, options) {
    var pathext = options.pathExt !== void 0 ? options.pathExt : process.env.PATHEXT;
    if (!pathext) {
      return true;
    }
    pathext = pathext.split(";");
    if (pathext.indexOf("") !== -1) {
      return true;
    }
    for (var i = 0; i < pathext.length; i++) {
      var p = pathext[i].toLowerCase();
      if (p && path2.substr(-p.length).toLowerCase() === p) {
        return true;
      }
    }
    return false;
  }
  function checkStat(stat, path2, options) {
    if (!stat.isSymbolicLink() && !stat.isFile()) {
      return false;
    }
    return checkPathExt(path2, options);
  }
  function isexe2(path2, options, cb) {
    fs$1.stat(path2, function(er, stat) {
      cb(er, er ? false : checkStat(stat, path2, options));
    });
  }
  function sync2(path2, options) {
    return checkStat(fs$1.statSync(path2), path2, options);
  }
  return windows;
}
var mode;
var hasRequiredMode;
function requireMode() {
  if (hasRequiredMode) return mode;
  hasRequiredMode = 1;
  mode = isexe2;
  isexe2.sync = sync2;
  var fs$1 = fs;
  function isexe2(path2, options, cb) {
    fs$1.stat(path2, function(er, stat) {
      cb(er, er ? false : checkStat(stat, options));
    });
  }
  function sync2(path2, options) {
    return checkStat(fs$1.statSync(path2), options);
  }
  function checkStat(stat, options) {
    return stat.isFile() && checkMode(stat, options);
  }
  function checkMode(stat, options) {
    var mod = stat.mode;
    var uid = stat.uid;
    var gid = stat.gid;
    var myUid = options.uid !== void 0 ? options.uid : process.getuid && process.getuid();
    var myGid = options.gid !== void 0 ? options.gid : process.getgid && process.getgid();
    var u = parseInt("100", 8);
    var g = parseInt("010", 8);
    var o = parseInt("001", 8);
    var ug = u | g;
    var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
    return ret;
  }
  return mode;
}
var core;
if (process.platform === "win32" || commonjsGlobal.TESTING_WINDOWS) {
  core = requireWindows();
} else {
  core = requireMode();
}
var isexe_1 = isexe$1;
isexe$1.sync = sync;
function isexe$1(path2, options, cb) {
  if (typeof options === "function") {
    cb = options;
    options = {};
  }
  if (!cb) {
    if (typeof Promise !== "function") {
      throw new TypeError("callback not provided");
    }
    return new Promise(function(resolve, reject) {
      isexe$1(path2, options || {}, function(er, is) {
        if (er) {
          reject(er);
        } else {
          resolve(is);
        }
      });
    });
  }
  core(path2, options || {}, function(er, is) {
    if (er) {
      if (er.code === "EACCES" || options && options.ignoreErrors) {
        er = null;
        is = false;
      }
    }
    cb(er, is);
  });
}
function sync(path2, options) {
  try {
    return core.sync(path2, options || {});
  } catch (er) {
    if (options && options.ignoreErrors || er.code === "EACCES") {
      return false;
    } else {
      throw er;
    }
  }
}
var which_1 = which$1;
which$1.sync = whichSync;
var isWindows$1 = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
var path$1 = path$2;
var COLON = isWindows$1 ? ";" : ":";
var isexe = isexe_1;
function getNotFoundError(cmd) {
  var er = new Error("not found: " + cmd);
  er.code = "ENOENT";
  return er;
}
function getPathInfo(cmd, opt) {
  var colon = opt.colon || COLON;
  var pathEnv = opt.path || process.env.PATH || "";
  var pathExt = [""];
  pathEnv = pathEnv.split(colon);
  var pathExtExe = "";
  if (isWindows$1) {
    pathEnv.unshift(process.cwd());
    pathExtExe = opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM";
    pathExt = pathExtExe.split(colon);
    if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
      pathExt.unshift("");
  }
  if (cmd.match(/\//) || isWindows$1 && cmd.match(/\\/))
    pathEnv = [""];
  return {
    env: pathEnv,
    ext: pathExt,
    extExe: pathExtExe
  };
}
function which$1(cmd, opt, cb) {
  if (typeof opt === "function") {
    cb = opt;
    opt = {};
  }
  var info = getPathInfo(cmd, opt);
  var pathEnv = info.env;
  var pathExt = info.ext;
  var pathExtExe = info.extExe;
  var found = [];
  (function F(i, l) {
    if (i === l) {
      if (opt.all && found.length)
        return cb(null, found);
      else
        return cb(getNotFoundError(cmd));
    }
    var pathPart = pathEnv[i];
    if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"')
      pathPart = pathPart.slice(1, -1);
    var p = path$1.join(pathPart, cmd);
    if (!pathPart && /^\.[\\\/]/.test(cmd)) {
      p = cmd.slice(0, 2) + p;
    }
    (function E(ii, ll) {
      if (ii === ll) return F(i + 1, l);
      var ext = pathExt[ii];
      isexe(p + ext, { pathExt: pathExtExe }, function(er, is) {
        if (!er && is) {
          if (opt.all)
            found.push(p + ext);
          else
            return cb(null, p + ext);
        }
        return E(ii + 1, ll);
      });
    })(0, pathExt.length);
  })(0, pathEnv.length);
}
function whichSync(cmd, opt) {
  opt = opt || {};
  var info = getPathInfo(cmd, opt);
  var pathEnv = info.env;
  var pathExt = info.ext;
  var pathExtExe = info.extExe;
  var found = [];
  for (var i = 0, l = pathEnv.length; i < l; i++) {
    var pathPart = pathEnv[i];
    if (pathPart.charAt(0) === '"' && pathPart.slice(-1) === '"')
      pathPart = pathPart.slice(1, -1);
    var p = path$1.join(pathPart, cmd);
    if (!pathPart && /^\.[\\\/]/.test(cmd)) {
      p = cmd.slice(0, 2) + p;
    }
    for (var j = 0, ll = pathExt.length; j < ll; j++) {
      var cur = p + pathExt[j];
      var is;
      try {
        is = isexe.sync(cur, { pathExt: pathExtExe });
        if (is) {
          if (opt.all)
            found.push(cur);
          else
            return cur;
        }
      } catch (ex) {
      }
    }
  }
  if (opt.all && found.length)
    return found;
  if (opt.nothrow)
    return null;
  throw getNotFoundError(cmd);
}
require$$0.exec;
var isWindows = require$$1.platform().match(/win(32|64)/);
var which = which_1;
var nlRegexp = /\r\n|\r|\n/g;
var streamRegexp = /^\[?(.*?)\]?$/;
var filterEscapeRegexp = /[,]/;
var whichCache = {};
function parseProgressLine(line) {
  var progress = {};
  line = line.replace(/=\s+/g, "=").trim();
  var progressParts = line.split(" ");
  for (var i = 0; i < progressParts.length; i++) {
    var progressSplit = progressParts[i].split("=", 2);
    var key = progressSplit[0];
    var value = progressSplit[1];
    if (typeof value === "undefined")
      return null;
    progress[key] = value;
  }
  return progress;
}
var utils$1 = utils$2.exports = {
  isWindows,
  streamRegexp,
  /**
   * Copy an object keys into another one
   *
   * @param {Object} source source object
   * @param {Object} dest destination object
   * @private
   */
  copy: function(source, dest) {
    Object.keys(source).forEach(function(key) {
      dest[key] = source[key];
    });
  },
  /**
   * Create an argument list
   *
   * Returns a function that adds new arguments to the list.
   * It also has the following methods:
   * - clear() empties the argument list
   * - get() returns the argument list
   * - find(arg, count) finds 'arg' in the list and return the following 'count' items, or undefined if not found
   * - remove(arg, count) remove 'arg' in the list as well as the following 'count' items
   *
   * @private
   */
  args: function() {
    var list = [];
    var argfunc = function() {
      if (arguments.length === 1 && Array.isArray(arguments[0])) {
        list = list.concat(arguments[0]);
      } else {
        list = list.concat([].slice.call(arguments));
      }
    };
    argfunc.clear = function() {
      list = [];
    };
    argfunc.get = function() {
      return list;
    };
    argfunc.find = function(arg, count) {
      var index = list.indexOf(arg);
      if (index !== -1) {
        return list.slice(index + 1, index + 1 + (count || 0));
      }
    };
    argfunc.remove = function(arg, count) {
      var index = list.indexOf(arg);
      if (index !== -1) {
        list.splice(index, (count || 0) + 1);
      }
    };
    argfunc.clone = function() {
      var cloned = utils$1.args();
      cloned(list);
      return cloned;
    };
    return argfunc;
  },
  /**
   * Generate filter strings
   *
   * @param {String[]|Object[]} filters filter specifications. When using objects,
   *   each must have the following properties:
   * @param {String} filters.filter filter name
   * @param {String|Array} [filters.inputs] (array of) input stream specifier(s) for the filter,
   *   defaults to ffmpeg automatically choosing the first unused matching streams
   * @param {String|Array} [filters.outputs] (array of) output stream specifier(s) for the filter,
   *   defaults to ffmpeg automatically assigning the output to the output file
   * @param {Object|String|Array} [filters.options] filter options, can be omitted to not set any options
   * @return String[]
   * @private
   */
  makeFilterStrings: function(filters) {
    return filters.map(function(filterSpec) {
      if (typeof filterSpec === "string") {
        return filterSpec;
      }
      var filterString = "";
      if (Array.isArray(filterSpec.inputs)) {
        filterString += filterSpec.inputs.map(function(streamSpec) {
          return streamSpec.replace(streamRegexp, "[$1]");
        }).join("");
      } else if (typeof filterSpec.inputs === "string") {
        filterString += filterSpec.inputs.replace(streamRegexp, "[$1]");
      }
      filterString += filterSpec.filter;
      if (filterSpec.options) {
        if (typeof filterSpec.options === "string" || typeof filterSpec.options === "number") {
          filterString += "=" + filterSpec.options;
        } else if (Array.isArray(filterSpec.options)) {
          filterString += "=" + filterSpec.options.map(function(option) {
            if (typeof option === "string" && option.match(filterEscapeRegexp)) {
              return "'" + option + "'";
            } else {
              return option;
            }
          }).join(":");
        } else if (Object.keys(filterSpec.options).length) {
          filterString += "=" + Object.keys(filterSpec.options).map(function(option) {
            var value = filterSpec.options[option];
            if (typeof value === "string" && value.match(filterEscapeRegexp)) {
              value = "'" + value + "'";
            }
            return option + "=" + value;
          }).join(":");
        }
      }
      if (Array.isArray(filterSpec.outputs)) {
        filterString += filterSpec.outputs.map(function(streamSpec) {
          return streamSpec.replace(streamRegexp, "[$1]");
        }).join("");
      } else if (typeof filterSpec.outputs === "string") {
        filterString += filterSpec.outputs.replace(streamRegexp, "[$1]");
      }
      return filterString;
    });
  },
  /**
   * Search for an executable
   *
   * Uses 'which' or 'where' depending on platform
   *
   * @param {String} name executable name
   * @param {Function} callback callback with signature (err, path)
   * @private
   */
  which: function(name, callback) {
    if (name in whichCache) {
      return callback(null, whichCache[name]);
    }
    which(name, function(err, result) {
      if (err) {
        return callback(null, whichCache[name] = "");
      }
      callback(null, whichCache[name] = result);
    });
  },
  /**
   * Convert a [[hh:]mm:]ss[.xxx] timemark into seconds
   *
   * @param {String} timemark timemark string
   * @return Number
   * @private
   */
  timemarkToSeconds: function(timemark) {
    if (typeof timemark === "number") {
      return timemark;
    }
    if (timemark.indexOf(":") === -1 && timemark.indexOf(".") >= 0) {
      return Number(timemark);
    }
    var parts = timemark.split(":");
    var secs = Number(parts.pop());
    if (parts.length) {
      secs += Number(parts.pop()) * 60;
    }
    if (parts.length) {
      secs += Number(parts.pop()) * 3600;
    }
    return secs;
  },
  /**
   * Extract codec data from ffmpeg stderr and emit 'codecData' event if appropriate
   * Call it with an initially empty codec object once with each line of stderr output until it returns true
   *
   * @param {FfmpegCommand} command event emitter
   * @param {String} stderrLine ffmpeg stderr output line
   * @param {Object} codecObject object used to accumulate codec data between calls
   * @return {Boolean} true if codec data is complete (and event was emitted), false otherwise
   * @private
   */
  extractCodecData: function(command, stderrLine, codecsObject) {
    var inputPattern = /Input #[0-9]+, ([^ ]+),/;
    var durPattern = /Duration\: ([^,]+)/;
    var audioPattern = /Audio\: (.*)/;
    var videoPattern = /Video\: (.*)/;
    if (!("inputStack" in codecsObject)) {
      codecsObject.inputStack = [];
      codecsObject.inputIndex = -1;
      codecsObject.inInput = false;
    }
    var inputStack = codecsObject.inputStack;
    var inputIndex = codecsObject.inputIndex;
    var inInput = codecsObject.inInput;
    var format, dur, audio2, video2;
    if (format = stderrLine.match(inputPattern)) {
      inInput = codecsObject.inInput = true;
      inputIndex = codecsObject.inputIndex = codecsObject.inputIndex + 1;
      inputStack[inputIndex] = { format: format[1], audio: "", video: "", duration: "" };
    } else if (inInput && (dur = stderrLine.match(durPattern))) {
      inputStack[inputIndex].duration = dur[1];
    } else if (inInput && (audio2 = stderrLine.match(audioPattern))) {
      audio2 = audio2[1].split(", ");
      inputStack[inputIndex].audio = audio2[0];
      inputStack[inputIndex].audio_details = audio2;
    } else if (inInput && (video2 = stderrLine.match(videoPattern))) {
      video2 = video2[1].split(", ");
      inputStack[inputIndex].video = video2[0];
      inputStack[inputIndex].video_details = video2;
    } else if (/Output #\d+/.test(stderrLine)) {
      inInput = codecsObject.inInput = false;
    } else if (/Stream mapping:|Press (\[q\]|ctrl-c) to stop/.test(stderrLine)) {
      command.emit.apply(command, ["codecData"].concat(inputStack));
      return true;
    }
    return false;
  },
  /**
   * Extract progress data from ffmpeg stderr and emit 'progress' event if appropriate
   *
   * @param {FfmpegCommand} command event emitter
   * @param {String} stderrLine ffmpeg stderr data
   * @private
   */
  extractProgress: function(command, stderrLine) {
    var progress = parseProgressLine(stderrLine);
    if (progress) {
      var ret = {
        frames: parseInt(progress.frame, 10),
        currentFps: parseInt(progress.fps, 10),
        currentKbps: progress.bitrate ? parseFloat(progress.bitrate.replace("kbits/s", "")) : 0,
        targetSize: parseInt(progress.size || progress.Lsize, 10),
        timemark: progress.time
      };
      if (command._ffprobeData && command._ffprobeData.format && command._ffprobeData.format.duration) {
        var duration = Number(command._ffprobeData.format.duration);
        if (!isNaN(duration))
          ret.percent = utils$1.timemarkToSeconds(ret.timemark) / duration * 100;
      }
      command.emit("progress", ret);
    }
  },
  /**
   * Extract error message(s) from ffmpeg stderr
   *
   * @param {String} stderr ffmpeg stderr data
   * @return {String}
   * @private
   */
  extractError: function(stderr) {
    return stderr.split(nlRegexp).reduce(function(messages, message) {
      if (message.charAt(0) === " " || message.charAt(0) === "[") {
        return [];
      } else {
        messages.push(message);
        return messages;
      }
    }, []).join("\n");
  },
  /**
   * Creates a line ring buffer object with the following methods:
   * - append(str) : appends a string or buffer
   * - get() : returns the whole string
   * - close() : prevents further append() calls and does a last call to callbacks
   * - callback(cb) : calls cb for each line (incl. those already in the ring)
   *
   * @param {Number} maxLines maximum number of lines to store (<= 0 for unlimited)
   */
  linesRing: function(maxLines) {
    var cbs = [];
    var lines = [];
    var current = null;
    var closed = false;
    var max = maxLines - 1;
    function emit(line) {
      cbs.forEach(function(cb) {
        cb(line);
      });
    }
    return {
      callback: function(cb) {
        lines.forEach(function(l) {
          cb(l);
        });
        cbs.push(cb);
      },
      append: function(str) {
        if (closed) return;
        if (str instanceof Buffer) str = "" + str;
        if (!str || str.length === 0) return;
        var newLines = str.split(nlRegexp);
        if (newLines.length === 1) {
          if (current !== null) {
            current = current + newLines.shift();
          } else {
            current = newLines.shift();
          }
        } else {
          if (current !== null) {
            current = current + newLines.shift();
            emit(current);
            lines.push(current);
          }
          current = newLines.pop();
          newLines.forEach(function(l) {
            emit(l);
            lines.push(l);
          });
          if (max > -1 && lines.length > max) {
            lines.splice(0, lines.length - max);
          }
        }
      },
      get: function() {
        if (current !== null) {
          return lines.concat([current]).join("\n");
        } else {
          return lines.join("\n");
        }
      },
      close: function() {
        if (closed) return;
        if (current !== null) {
          emit(current);
          lines.push(current);
          if (max > -1 && lines.length > max) {
            lines.shift();
          }
          current = null;
        }
        closed = true;
      }
    };
  }
};
var utilsExports = utils$2.exports;
var inputs;
var hasRequiredInputs;
function requireInputs() {
  if (hasRequiredInputs) return inputs;
  hasRequiredInputs = 1;
  var utils2 = utilsExports;
  inputs = function(proto) {
    proto.mergeAdd = proto.addInput = proto.input = function(source) {
      var isFile = false;
      var isStream = false;
      if (typeof source !== "string") {
        if (!("readable" in source) || !source.readable) {
          throw new Error("Invalid input");
        }
        var hasInputStream = this._inputs.some(function(input) {
          return input.isStream;
        });
        if (hasInputStream) {
          throw new Error("Only one input stream is supported");
        }
        isStream = true;
        source.pause();
      } else {
        var protocol = source.match(/^([a-z]{2,}):/i);
        isFile = !protocol || protocol[0] === "file";
      }
      this._inputs.push(this._currentInput = {
        source,
        isFile,
        isStream,
        options: utils2.args()
      });
      return this;
    };
    proto.withInputFormat = proto.inputFormat = proto.fromFormat = function(format) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-f", format);
      return this;
    };
    proto.withInputFps = proto.withInputFPS = proto.withFpsInput = proto.withFPSInput = proto.inputFPS = proto.inputFps = proto.fpsInput = proto.FPSInput = function(fps) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-r", fps);
      return this;
    };
    proto.nativeFramerate = proto.withNativeFramerate = proto.native = function() {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-re");
      return this;
    };
    proto.setStartTime = proto.seekInput = function(seek) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-ss", seek);
      return this;
    };
    proto.loop = function(duration) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      this._currentInput.options("-loop", "1");
      if (typeof duration !== "undefined") {
        this.duration(duration);
      }
      return this;
    };
  };
  return inputs;
}
var audio;
var hasRequiredAudio;
function requireAudio() {
  if (hasRequiredAudio) return audio;
  hasRequiredAudio = 1;
  var utils2 = utilsExports;
  audio = function(proto) {
    proto.withNoAudio = proto.noAudio = function() {
      this._currentOutput.audio.clear();
      this._currentOutput.audioFilters.clear();
      this._currentOutput.audio("-an");
      return this;
    };
    proto.withAudioCodec = proto.audioCodec = function(codec) {
      this._currentOutput.audio("-acodec", codec);
      return this;
    };
    proto.withAudioBitrate = proto.audioBitrate = function(bitrate) {
      this._currentOutput.audio("-b:a", ("" + bitrate).replace(/k?$/, "k"));
      return this;
    };
    proto.withAudioChannels = proto.audioChannels = function(channels) {
      this._currentOutput.audio("-ac", channels);
      return this;
    };
    proto.withAudioFrequency = proto.audioFrequency = function(freq) {
      this._currentOutput.audio("-ar", freq);
      return this;
    };
    proto.withAudioQuality = proto.audioQuality = function(quality) {
      this._currentOutput.audio("-aq", quality);
      return this;
    };
    proto.withAudioFilter = proto.withAudioFilters = proto.audioFilter = proto.audioFilters = function(filters) {
      if (arguments.length > 1) {
        filters = [].slice.call(arguments);
      }
      if (!Array.isArray(filters)) {
        filters = [filters];
      }
      this._currentOutput.audioFilters(utils2.makeFilterStrings(filters));
      return this;
    };
  };
  return audio;
}
var video;
var hasRequiredVideo;
function requireVideo() {
  if (hasRequiredVideo) return video;
  hasRequiredVideo = 1;
  var utils2 = utilsExports;
  video = function(proto) {
    proto.withNoVideo = proto.noVideo = function() {
      this._currentOutput.video.clear();
      this._currentOutput.videoFilters.clear();
      this._currentOutput.video("-vn");
      return this;
    };
    proto.withVideoCodec = proto.videoCodec = function(codec) {
      this._currentOutput.video("-vcodec", codec);
      return this;
    };
    proto.withVideoBitrate = proto.videoBitrate = function(bitrate, constant) {
      bitrate = ("" + bitrate).replace(/k?$/, "k");
      this._currentOutput.video("-b:v", bitrate);
      if (constant) {
        this._currentOutput.video(
          "-maxrate",
          bitrate,
          "-minrate",
          bitrate,
          "-bufsize",
          "3M"
        );
      }
      return this;
    };
    proto.withVideoFilter = proto.withVideoFilters = proto.videoFilter = proto.videoFilters = function(filters) {
      if (arguments.length > 1) {
        filters = [].slice.call(arguments);
      }
      if (!Array.isArray(filters)) {
        filters = [filters];
      }
      this._currentOutput.videoFilters(utils2.makeFilterStrings(filters));
      return this;
    };
    proto.withOutputFps = proto.withOutputFPS = proto.withFpsOutput = proto.withFPSOutput = proto.withFps = proto.withFPS = proto.outputFPS = proto.outputFps = proto.fpsOutput = proto.FPSOutput = proto.fps = proto.FPS = function(fps) {
      this._currentOutput.video("-r", fps);
      return this;
    };
    proto.takeFrames = proto.withFrames = proto.frames = function(frames) {
      this._currentOutput.video("-vframes", frames);
      return this;
    };
  };
  return video;
}
var videosize;
var hasRequiredVideosize;
function requireVideosize() {
  if (hasRequiredVideosize) return videosize;
  hasRequiredVideosize = 1;
  function getScalePadFilters(width, height, aspect, color) {
    return [
      /*
        In both cases, we first have to scale the input to match the requested size.
        When using computed width/height, we truncate them to multiples of 2
       */
      {
        filter: "scale",
        options: {
          w: "if(gt(a," + aspect + ")," + width + ",trunc(" + height + "*a/2)*2)",
          h: "if(lt(a," + aspect + ")," + height + ",trunc(" + width + "/a/2)*2)"
        }
      },
      /*
        Then we pad the scaled input to match the target size
        (here iw and ih refer to the padding input, i.e the scaled output)
       */
      {
        filter: "pad",
        options: {
          w: width,
          h: height,
          x: "if(gt(a," + aspect + "),0,(" + width + "-iw)/2)",
          y: "if(lt(a," + aspect + "),0,(" + height + "-ih)/2)",
          color
        }
      }
    ];
  }
  function createSizeFilters(output2, key, value) {
    var data = output2.sizeData = output2.sizeData || {};
    data[key] = value;
    if (!("size" in data)) {
      return [];
    }
    var fixedSize = data.size.match(/([0-9]+)x([0-9]+)/);
    var fixedWidth = data.size.match(/([0-9]+)x\?/);
    var fixedHeight = data.size.match(/\?x([0-9]+)/);
    var percentRatio = data.size.match(/\b([0-9]{1,3})%/);
    var width, height, aspect;
    if (percentRatio) {
      var ratio = Number(percentRatio[1]) / 100;
      return [{
        filter: "scale",
        options: {
          w: "trunc(iw*" + ratio + "/2)*2",
          h: "trunc(ih*" + ratio + "/2)*2"
        }
      }];
    } else if (fixedSize) {
      width = Math.round(Number(fixedSize[1]) / 2) * 2;
      height = Math.round(Number(fixedSize[2]) / 2) * 2;
      aspect = width / height;
      if (data.pad) {
        return getScalePadFilters(width, height, aspect, data.pad);
      } else {
        return [{ filter: "scale", options: { w: width, h: height } }];
      }
    } else if (fixedWidth || fixedHeight) {
      if ("aspect" in data) {
        width = fixedWidth ? fixedWidth[1] : Math.round(Number(fixedHeight[1]) * data.aspect);
        height = fixedHeight ? fixedHeight[1] : Math.round(Number(fixedWidth[1]) / data.aspect);
        width = Math.round(width / 2) * 2;
        height = Math.round(height / 2) * 2;
        if (data.pad) {
          return getScalePadFilters(width, height, data.aspect, data.pad);
        } else {
          return [{ filter: "scale", options: { w: width, h: height } }];
        }
      } else {
        if (fixedWidth) {
          return [{
            filter: "scale",
            options: {
              w: Math.round(Number(fixedWidth[1]) / 2) * 2,
              h: "trunc(ow/a/2)*2"
            }
          }];
        } else {
          return [{
            filter: "scale",
            options: {
              w: "trunc(oh*a/2)*2",
              h: Math.round(Number(fixedHeight[1]) / 2) * 2
            }
          }];
        }
      }
    } else {
      throw new Error("Invalid size specified: " + data.size);
    }
  }
  videosize = function(proto) {
    proto.keepPixelAspect = // Only for compatibility, this is not about keeping _pixel_ aspect ratio
    proto.keepDisplayAspect = proto.keepDisplayAspectRatio = proto.keepDAR = function() {
      return this.videoFilters([
        {
          filter: "scale",
          options: {
            w: "if(gt(sar,1),iw*sar,iw)",
            h: "if(lt(sar,1),ih/sar,ih)"
          }
        },
        {
          filter: "setsar",
          options: "1"
        }
      ]);
    };
    proto.withSize = proto.setSize = proto.size = function(size) {
      var filters = createSizeFilters(this._currentOutput, "size", size);
      this._currentOutput.sizeFilters.clear();
      this._currentOutput.sizeFilters(filters);
      return this;
    };
    proto.withAspect = proto.withAspectRatio = proto.setAspect = proto.setAspectRatio = proto.aspect = proto.aspectRatio = function(aspect) {
      var a = Number(aspect);
      if (isNaN(a)) {
        var match = aspect.match(/^(\d+):(\d+)$/);
        if (match) {
          a = Number(match[1]) / Number(match[2]);
        } else {
          throw new Error("Invalid aspect ratio: " + aspect);
        }
      }
      var filters = createSizeFilters(this._currentOutput, "aspect", a);
      this._currentOutput.sizeFilters.clear();
      this._currentOutput.sizeFilters(filters);
      return this;
    };
    proto.applyAutopadding = proto.applyAutoPadding = proto.applyAutopad = proto.applyAutoPad = proto.withAutopadding = proto.withAutoPadding = proto.withAutopad = proto.withAutoPad = proto.autoPad = proto.autopad = function(pad, color) {
      if (typeof pad === "string") {
        color = pad;
        pad = true;
      }
      if (typeof pad === "undefined") {
        pad = true;
      }
      var filters = createSizeFilters(this._currentOutput, "pad", pad ? color || "black" : false);
      this._currentOutput.sizeFilters.clear();
      this._currentOutput.sizeFilters(filters);
      return this;
    };
  };
  return videosize;
}
var output;
var hasRequiredOutput;
function requireOutput() {
  if (hasRequiredOutput) return output;
  hasRequiredOutput = 1;
  var utils2 = utilsExports;
  output = function(proto) {
    proto.addOutput = proto.output = function(target, pipeopts) {
      var isFile = false;
      if (!target && this._currentOutput) {
        throw new Error("Invalid output");
      }
      if (target && typeof target !== "string") {
        if (!("writable" in target) || !target.writable) {
          throw new Error("Invalid output");
        }
      } else if (typeof target === "string") {
        var protocol = target.match(/^([a-z]{2,}):/i);
        isFile = !protocol || protocol[0] === "file";
      }
      if (target && !("target" in this._currentOutput)) {
        this._currentOutput.target = target;
        this._currentOutput.isFile = isFile;
        this._currentOutput.pipeopts = pipeopts || {};
      } else {
        if (target && typeof target !== "string") {
          var hasOutputStream = this._outputs.some(function(output2) {
            return typeof output2.target !== "string";
          });
          if (hasOutputStream) {
            throw new Error("Only one output stream is supported");
          }
        }
        this._outputs.push(this._currentOutput = {
          target,
          isFile,
          flags: {},
          pipeopts: pipeopts || {}
        });
        var self2 = this;
        ["audio", "audioFilters", "video", "videoFilters", "sizeFilters", "options"].forEach(function(key) {
          self2._currentOutput[key] = utils2.args();
        });
        if (!target) {
          delete this._currentOutput.target;
        }
      }
      return this;
    };
    proto.seekOutput = proto.seek = function(seek) {
      this._currentOutput.options("-ss", seek);
      return this;
    };
    proto.withDuration = proto.setDuration = proto.duration = function(duration) {
      this._currentOutput.options("-t", duration);
      return this;
    };
    proto.toFormat = proto.withOutputFormat = proto.outputFormat = proto.format = function(format) {
      this._currentOutput.options("-f", format);
      return this;
    };
    proto.map = function(spec) {
      this._currentOutput.options("-map", spec.replace(utils2.streamRegexp, "[$1]"));
      return this;
    };
    proto.updateFlvMetadata = proto.flvmeta = function() {
      this._currentOutput.flags.flvmeta = true;
      return this;
    };
  };
  return output;
}
var custom;
var hasRequiredCustom;
function requireCustom() {
  if (hasRequiredCustom) return custom;
  hasRequiredCustom = 1;
  var utils2 = utilsExports;
  custom = function(proto) {
    proto.addInputOption = proto.addInputOptions = proto.withInputOption = proto.withInputOptions = proto.inputOption = proto.inputOptions = function(options) {
      if (!this._currentInput) {
        throw new Error("No input specified");
      }
      var doSplit = true;
      if (arguments.length > 1) {
        options = [].slice.call(arguments);
        doSplit = false;
      }
      if (!Array.isArray(options)) {
        options = [options];
      }
      this._currentInput.options(options.reduce(function(options2, option) {
        var split = String(option).split(" ");
        if (doSplit && split.length === 2) {
          options2.push(split[0], split[1]);
        } else {
          options2.push(option);
        }
        return options2;
      }, []));
      return this;
    };
    proto.addOutputOption = proto.addOutputOptions = proto.addOption = proto.addOptions = proto.withOutputOption = proto.withOutputOptions = proto.withOption = proto.withOptions = proto.outputOption = proto.outputOptions = function(options) {
      var doSplit = true;
      if (arguments.length > 1) {
        options = [].slice.call(arguments);
        doSplit = false;
      }
      if (!Array.isArray(options)) {
        options = [options];
      }
      this._currentOutput.options(options.reduce(function(options2, option) {
        var split = String(option).split(" ");
        if (doSplit && split.length === 2) {
          options2.push(split[0], split[1]);
        } else {
          options2.push(option);
        }
        return options2;
      }, []));
      return this;
    };
    proto.filterGraph = proto.complexFilter = function(spec, map) {
      this._complexFilters.clear();
      if (!Array.isArray(spec)) {
        spec = [spec];
      }
      this._complexFilters("-filter_complex", utils2.makeFilterStrings(spec).join(";"));
      if (Array.isArray(map)) {
        var self2 = this;
        map.forEach(function(streamSpec) {
          self2._complexFilters("-map", streamSpec.replace(utils2.streamRegexp, "[$1]"));
        });
      } else if (typeof map === "string") {
        this._complexFilters("-map", map.replace(utils2.streamRegexp, "[$1]"));
      }
      return this;
    };
  };
  return custom;
}
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var misc;
var hasRequiredMisc;
function requireMisc() {
  if (hasRequiredMisc) return misc;
  hasRequiredMisc = 1;
  var path2 = path$2;
  misc = function(proto) {
    proto.usingPreset = proto.preset = function(preset) {
      if (typeof preset === "function") {
        preset(this);
      } else {
        try {
          var modulePath = path2.join(this.options.presets, preset);
          var module = commonjsRequire(modulePath);
          if (typeof module.load === "function") {
            module.load(this);
          } else {
            throw new Error("preset " + modulePath + " has no load() function");
          }
        } catch (err) {
          throw new Error("preset " + modulePath + " could not be loaded: " + err.message);
        }
      }
      return this;
    };
  };
  return misc;
}
var async = { exports: {} };
var hasRequiredAsync;
function requireAsync() {
  if (hasRequiredAsync) return async.exports;
  hasRequiredAsync = 1;
  (function(module) {
    (function() {
      var async2 = {};
      var root, previous_async;
      root = this;
      if (root != null) {
        previous_async = root.async;
      }
      async2.noConflict = function() {
        root.async = previous_async;
        return async2;
      };
      function only_once(fn) {
        var called = false;
        return function() {
          if (called) throw new Error("Callback was already called.");
          called = true;
          fn.apply(root, arguments);
        };
      }
      var _each = function(arr, iterator) {
        if (arr.forEach) {
          return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
          iterator(arr[i], i, arr);
        }
      };
      var _map = function(arr, iterator) {
        if (arr.map) {
          return arr.map(iterator);
        }
        var results = [];
        _each(arr, function(x, i, a) {
          results.push(iterator(x, i, a));
        });
        return results;
      };
      var _reduce = function(arr, iterator, memo) {
        if (arr.reduce) {
          return arr.reduce(iterator, memo);
        }
        _each(arr, function(x, i, a) {
          memo = iterator(memo, x, i, a);
        });
        return memo;
      };
      var _keys = function(obj) {
        if (Object.keys) {
          return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
          if (obj.hasOwnProperty(k)) {
            keys.push(k);
          }
        }
        return keys;
      };
      if (typeof process === "undefined" || !process.nextTick) {
        if (typeof setImmediate === "function") {
          async2.nextTick = function(fn) {
            setImmediate(fn);
          };
          async2.setImmediate = async2.nextTick;
        } else {
          async2.nextTick = function(fn) {
            setTimeout(fn, 0);
          };
          async2.setImmediate = async2.nextTick;
        }
      } else {
        async2.nextTick = process.nextTick;
        if (typeof setImmediate !== "undefined") {
          async2.setImmediate = function(fn) {
            setImmediate(fn);
          };
        } else {
          async2.setImmediate = async2.nextTick;
        }
      }
      async2.each = function(arr, iterator, callback) {
        callback = callback || function() {
        };
        if (!arr.length) {
          return callback();
        }
        var completed = 0;
        _each(arr, function(x) {
          iterator(x, only_once(function(err) {
            if (err) {
              callback(err);
              callback = function() {
              };
            } else {
              completed += 1;
              if (completed >= arr.length) {
                callback(null);
              }
            }
          }));
        });
      };
      async2.forEach = async2.each;
      async2.eachSeries = function(arr, iterator, callback) {
        callback = callback || function() {
        };
        if (!arr.length) {
          return callback();
        }
        var completed = 0;
        var iterate = function() {
          iterator(arr[completed], function(err) {
            if (err) {
              callback(err);
              callback = function() {
              };
            } else {
              completed += 1;
              if (completed >= arr.length) {
                callback(null);
              } else {
                iterate();
              }
            }
          });
        };
        iterate();
      };
      async2.forEachSeries = async2.eachSeries;
      async2.eachLimit = function(arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
      };
      async2.forEachLimit = async2.eachLimit;
      var _eachLimit = function(limit) {
        return function(arr, iterator, callback) {
          callback = callback || function() {
          };
          if (!arr.length || limit <= 0) {
            return callback();
          }
          var completed = 0;
          var started = 0;
          var running = 0;
          (function replenish() {
            if (completed >= arr.length) {
              return callback();
            }
            while (running < limit && started < arr.length) {
              started += 1;
              running += 1;
              iterator(arr[started - 1], function(err) {
                if (err) {
                  callback(err);
                  callback = function() {
                  };
                } else {
                  completed += 1;
                  running -= 1;
                  if (completed >= arr.length) {
                    callback();
                  } else {
                    replenish();
                  }
                }
              });
            }
          })();
        };
      };
      var doParallel = function(fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [async2.each].concat(args));
        };
      };
      var doParallelLimit = function(limit, fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
      };
      var doSeries = function(fn) {
        return function() {
          var args = Array.prototype.slice.call(arguments);
          return fn.apply(null, [async2.eachSeries].concat(args));
        };
      };
      var _asyncMap = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
          return { index: i, value: x };
        });
        eachfn(arr, function(x, callback2) {
          iterator(x.value, function(err, v) {
            results[x.index] = v;
            callback2(err);
          });
        }, function(err) {
          callback(err, results);
        });
      };
      async2.map = doParallel(_asyncMap);
      async2.mapSeries = doSeries(_asyncMap);
      async2.mapLimit = function(arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
      };
      var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
      };
      async2.reduce = function(arr, memo, iterator, callback) {
        async2.eachSeries(arr, function(x, callback2) {
          iterator(memo, x, function(err, v) {
            memo = v;
            callback2(err);
          });
        }, function(err) {
          callback(err, memo);
        });
      };
      async2.inject = async2.reduce;
      async2.foldl = async2.reduce;
      async2.reduceRight = function(arr, memo, iterator, callback) {
        var reversed = _map(arr, function(x) {
          return x;
        }).reverse();
        async2.reduce(reversed, memo, iterator, callback);
      };
      async2.foldr = async2.reduceRight;
      var _filter = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
          return { index: i, value: x };
        });
        eachfn(arr, function(x, callback2) {
          iterator(x.value, function(v) {
            if (v) {
              results.push(x);
            }
            callback2();
          });
        }, function(err) {
          callback(_map(results.sort(function(a, b) {
            return a.index - b.index;
          }), function(x) {
            return x.value;
          }));
        });
      };
      async2.filter = doParallel(_filter);
      async2.filterSeries = doSeries(_filter);
      async2.select = async2.filter;
      async2.selectSeries = async2.filterSeries;
      var _reject = function(eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function(x, i) {
          return { index: i, value: x };
        });
        eachfn(arr, function(x, callback2) {
          iterator(x.value, function(v) {
            if (!v) {
              results.push(x);
            }
            callback2();
          });
        }, function(err) {
          callback(_map(results.sort(function(a, b) {
            return a.index - b.index;
          }), function(x) {
            return x.value;
          }));
        });
      };
      async2.reject = doParallel(_reject);
      async2.rejectSeries = doSeries(_reject);
      var _detect = function(eachfn, arr, iterator, main_callback) {
        eachfn(arr, function(x, callback) {
          iterator(x, function(result) {
            if (result) {
              main_callback(x);
              main_callback = function() {
              };
            } else {
              callback();
            }
          });
        }, function(err) {
          main_callback();
        });
      };
      async2.detect = doParallel(_detect);
      async2.detectSeries = doSeries(_detect);
      async2.some = function(arr, iterator, main_callback) {
        async2.each(arr, function(x, callback) {
          iterator(x, function(v) {
            if (v) {
              main_callback(true);
              main_callback = function() {
              };
            }
            callback();
          });
        }, function(err) {
          main_callback(false);
        });
      };
      async2.any = async2.some;
      async2.every = function(arr, iterator, main_callback) {
        async2.each(arr, function(x, callback) {
          iterator(x, function(v) {
            if (!v) {
              main_callback(false);
              main_callback = function() {
              };
            }
            callback();
          });
        }, function(err) {
          main_callback(true);
        });
      };
      async2.all = async2.every;
      async2.sortBy = function(arr, iterator, callback) {
        async2.map(arr, function(x, callback2) {
          iterator(x, function(err, criteria) {
            if (err) {
              callback2(err);
            } else {
              callback2(null, { value: x, criteria });
            }
          });
        }, function(err, results) {
          if (err) {
            return callback(err);
          } else {
            var fn = function(left, right) {
              var a = left.criteria, b = right.criteria;
              return a < b ? -1 : a > b ? 1 : 0;
            };
            callback(null, _map(results.sort(fn), function(x) {
              return x.value;
            }));
          }
        });
      };
      async2.auto = function(tasks, callback) {
        callback = callback || function() {
        };
        var keys = _keys(tasks);
        if (!keys.length) {
          return callback(null);
        }
        var results = {};
        var listeners = [];
        var addListener = function(fn) {
          listeners.unshift(fn);
        };
        var removeListener = function(fn) {
          for (var i = 0; i < listeners.length; i += 1) {
            if (listeners[i] === fn) {
              listeners.splice(i, 1);
              return;
            }
          }
        };
        var taskComplete = function() {
          _each(listeners.slice(0), function(fn) {
            fn();
          });
        };
        addListener(function() {
          if (_keys(results).length === keys.length) {
            callback(null, results);
            callback = function() {
            };
          }
        });
        _each(keys, function(k) {
          var task = tasks[k] instanceof Function ? [tasks[k]] : tasks[k];
          var taskCallback = function(err) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (args.length <= 1) {
              args = args[0];
            }
            if (err) {
              var safeResults = {};
              _each(_keys(results), function(rkey) {
                safeResults[rkey] = results[rkey];
              });
              safeResults[k] = args;
              callback(err, safeResults);
              callback = function() {
              };
            } else {
              results[k] = args;
              async2.setImmediate(taskComplete);
            }
          };
          var requires = task.slice(0, Math.abs(task.length - 1)) || [];
          var ready = function() {
            return _reduce(requires, function(a, x) {
              return a && results.hasOwnProperty(x);
            }, true) && !results.hasOwnProperty(k);
          };
          if (ready()) {
            task[task.length - 1](taskCallback, results);
          } else {
            var listener = function() {
              if (ready()) {
                removeListener(listener);
                task[task.length - 1](taskCallback, results);
              }
            };
            addListener(listener);
          }
        });
      };
      async2.waterfall = function(tasks, callback) {
        callback = callback || function() {
        };
        if (tasks.constructor !== Array) {
          var err = new Error("First argument to waterfall must be an array of functions");
          return callback(err);
        }
        if (!tasks.length) {
          return callback();
        }
        var wrapIterator = function(iterator) {
          return function(err2) {
            if (err2) {
              callback.apply(null, arguments);
              callback = function() {
              };
            } else {
              var args = Array.prototype.slice.call(arguments, 1);
              var next = iterator.next();
              if (next) {
                args.push(wrapIterator(next));
              } else {
                args.push(callback);
              }
              async2.setImmediate(function() {
                iterator.apply(null, args);
              });
            }
          };
        };
        wrapIterator(async2.iterator(tasks))();
      };
      var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function() {
        };
        if (tasks.constructor === Array) {
          eachfn.map(tasks, function(fn, callback2) {
            if (fn) {
              fn(function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                callback2.call(null, err, args);
              });
            }
          }, callback);
        } else {
          var results = {};
          eachfn.each(_keys(tasks), function(k, callback2) {
            tasks[k](function(err) {
              var args = Array.prototype.slice.call(arguments, 1);
              if (args.length <= 1) {
                args = args[0];
              }
              results[k] = args;
              callback2(err);
            });
          }, function(err) {
            callback(err, results);
          });
        }
      };
      async2.parallel = function(tasks, callback) {
        _parallel({ map: async2.map, each: async2.each }, tasks, callback);
      };
      async2.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
      };
      async2.series = function(tasks, callback) {
        callback = callback || function() {
        };
        if (tasks.constructor === Array) {
          async2.mapSeries(tasks, function(fn, callback2) {
            if (fn) {
              fn(function(err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                  args = args[0];
                }
                callback2.call(null, err, args);
              });
            }
          }, callback);
        } else {
          var results = {};
          async2.eachSeries(_keys(tasks), function(k, callback2) {
            tasks[k](function(err) {
              var args = Array.prototype.slice.call(arguments, 1);
              if (args.length <= 1) {
                args = args[0];
              }
              results[k] = args;
              callback2(err);
            });
          }, function(err) {
            callback(err, results);
          });
        }
      };
      async2.iterator = function(tasks) {
        var makeCallback = function(index) {
          var fn = function() {
            if (tasks.length) {
              tasks[index].apply(null, arguments);
            }
            return fn.next();
          };
          fn.next = function() {
            return index < tasks.length - 1 ? makeCallback(index + 1) : null;
          };
          return fn;
        };
        return makeCallback(0);
      };
      async2.apply = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
          return fn.apply(
            null,
            args.concat(Array.prototype.slice.call(arguments))
          );
        };
      };
      var _concat = function(eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function(x, cb) {
          fn(x, function(err, y) {
            r = r.concat(y || []);
            cb(err);
          });
        }, function(err) {
          callback(err, r);
        });
      };
      async2.concat = doParallel(_concat);
      async2.concatSeries = doSeries(_concat);
      async2.whilst = function(test, iterator, callback) {
        if (test()) {
          iterator(function(err) {
            if (err) {
              return callback(err);
            }
            async2.whilst(test, iterator, callback);
          });
        } else {
          callback();
        }
      };
      async2.doWhilst = function(iterator, test, callback) {
        iterator(function(err) {
          if (err) {
            return callback(err);
          }
          if (test()) {
            async2.doWhilst(iterator, test, callback);
          } else {
            callback();
          }
        });
      };
      async2.until = function(test, iterator, callback) {
        if (!test()) {
          iterator(function(err) {
            if (err) {
              return callback(err);
            }
            async2.until(test, iterator, callback);
          });
        } else {
          callback();
        }
      };
      async2.doUntil = function(iterator, test, callback) {
        iterator(function(err) {
          if (err) {
            return callback(err);
          }
          if (!test()) {
            async2.doUntil(iterator, test, callback);
          } else {
            callback();
          }
        });
      };
      async2.queue = function(worker, concurrency) {
        if (concurrency === void 0) {
          concurrency = 1;
        }
        function _insert(q2, data, pos, callback) {
          if (data.constructor !== Array) {
            data = [data];
          }
          _each(data, function(task) {
            var item = {
              data: task,
              callback: typeof callback === "function" ? callback : null
            };
            if (pos) {
              q2.tasks.unshift(item);
            } else {
              q2.tasks.push(item);
            }
            if (q2.saturated && q2.tasks.length === concurrency) {
              q2.saturated();
            }
            async2.setImmediate(q2.process);
          });
        }
        var workers = 0;
        var q = {
          tasks: [],
          concurrency,
          saturated: null,
          empty: null,
          drain: null,
          push: function(data, callback) {
            _insert(q, data, false, callback);
          },
          unshift: function(data, callback) {
            _insert(q, data, true, callback);
          },
          process: function() {
            if (workers < q.concurrency && q.tasks.length) {
              var task = q.tasks.shift();
              if (q.empty && q.tasks.length === 0) {
                q.empty();
              }
              workers += 1;
              var next = function() {
                workers -= 1;
                if (task.callback) {
                  task.callback.apply(task, arguments);
                }
                if (q.drain && q.tasks.length + workers === 0) {
                  q.drain();
                }
                q.process();
              };
              var cb = only_once(next);
              worker(task.data, cb);
            }
          },
          length: function() {
            return q.tasks.length;
          },
          running: function() {
            return workers;
          }
        };
        return q;
      };
      async2.cargo = function(worker, payload) {
        var working = false, tasks = [];
        var cargo = {
          tasks,
          payload,
          saturated: null,
          empty: null,
          drain: null,
          push: function(data, callback) {
            if (data.constructor !== Array) {
              data = [data];
            }
            _each(data, function(task) {
              tasks.push({
                data: task,
                callback: typeof callback === "function" ? callback : null
              });
              if (cargo.saturated && tasks.length === payload) {
                cargo.saturated();
              }
            });
            async2.setImmediate(cargo.process);
          },
          process: function process2() {
            if (working) return;
            if (tasks.length === 0) {
              if (cargo.drain) cargo.drain();
              return;
            }
            var ts = typeof payload === "number" ? tasks.splice(0, payload) : tasks.splice(0);
            var ds = _map(ts, function(task) {
              return task.data;
            });
            if (cargo.empty) cargo.empty();
            working = true;
            worker(ds, function() {
              working = false;
              var args = arguments;
              _each(ts, function(data) {
                if (data.callback) {
                  data.callback.apply(null, args);
                }
              });
              process2();
            });
          },
          length: function() {
            return tasks.length;
          },
          running: function() {
            return working;
          }
        };
        return cargo;
      };
      var _console_fn = function(name) {
        return function(fn) {
          var args = Array.prototype.slice.call(arguments, 1);
          fn.apply(null, args.concat([function(err) {
            var args2 = Array.prototype.slice.call(arguments, 1);
            if (typeof console !== "undefined") {
              if (err) {
                if (console.error) {
                  console.error(err);
                }
              } else if (console[name]) {
                _each(args2, function(x) {
                  console[name](x);
                });
              }
            }
          }]));
        };
      };
      async2.log = _console_fn("log");
      async2.dir = _console_fn("dir");
      async2.memoize = function(fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function(x) {
          return x;
        };
        var memoized = function() {
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          var key = hasher.apply(null, args);
          if (key in memo) {
            callback.apply(null, memo[key]);
          } else if (key in queues) {
            queues[key].push(callback);
          } else {
            queues[key] = [callback];
            fn.apply(null, args.concat([function() {
              memo[key] = arguments;
              var q = queues[key];
              delete queues[key];
              for (var i = 0, l = q.length; i < l; i++) {
                q[i].apply(null, arguments);
              }
            }]));
          }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
      };
      async2.unmemoize = function(fn) {
        return function() {
          return (fn.unmemoized || fn).apply(null, arguments);
        };
      };
      async2.times = function(count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
          counter.push(i);
        }
        return async2.map(counter, iterator, callback);
      };
      async2.timesSeries = function(count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
          counter.push(i);
        }
        return async2.mapSeries(counter, iterator, callback);
      };
      async2.compose = function() {
        var fns = Array.prototype.reverse.call(arguments);
        return function() {
          var that = this;
          var args = Array.prototype.slice.call(arguments);
          var callback = args.pop();
          async2.reduce(
            fns,
            args,
            function(newargs, fn, cb) {
              fn.apply(that, newargs.concat([function() {
                var err = arguments[0];
                var nextargs = Array.prototype.slice.call(arguments, 1);
                cb(err, nextargs);
              }]));
            },
            function(err, results) {
              callback.apply(that, [err].concat(results));
            }
          );
        };
      };
      var _applyEach = function(eachfn, fns) {
        var go = function() {
          var that = this;
          var args2 = Array.prototype.slice.call(arguments);
          var callback = args2.pop();
          return eachfn(
            fns,
            function(fn, cb) {
              fn.apply(that, args2.concat([cb]));
            },
            callback
          );
        };
        if (arguments.length > 2) {
          var args = Array.prototype.slice.call(arguments, 2);
          return go.apply(this, args);
        } else {
          return go;
        }
      };
      async2.applyEach = doParallel(_applyEach);
      async2.applyEachSeries = doSeries(_applyEach);
      async2.forever = function(fn, callback) {
        function next(err) {
          if (err) {
            if (callback) {
              return callback(err);
            }
            throw err;
          }
          fn(next);
        }
        next();
      };
      if (module.exports) {
        module.exports = async2;
      } else {
        root.async = async2;
      }
    })();
  })(async);
  return async.exports;
}
var processor;
var hasRequiredProcessor;
function requireProcessor() {
  if (hasRequiredProcessor) return processor;
  hasRequiredProcessor = 1;
  var spawn = require$$0.spawn;
  var async2 = requireAsync();
  var utils2 = utilsExports;
  function runFfprobe(command) {
    const inputProbeIndex = 0;
    if (command._inputs[inputProbeIndex].isStream) {
      return;
    }
    command.ffprobe(inputProbeIndex, function(err, data) {
      command._ffprobeData = data;
    });
  }
  processor = function(proto) {
    proto._spawnFfmpeg = function(args, options, processCB, endCB) {
      if (typeof options === "function") {
        endCB = processCB;
        processCB = options;
        options = {};
      }
      if (typeof endCB === "undefined") {
        endCB = processCB;
        processCB = function() {
        };
      }
      var maxLines = "stdoutLines" in options ? options.stdoutLines : this.options.stdoutLines;
      this._getFfmpegPath(function(err, command) {
        if (err) {
          return endCB(err);
        } else if (!command || command.length === 0) {
          return endCB(new Error("Cannot find ffmpeg"));
        }
        if (options.niceness && options.niceness !== 0 && !utils2.isWindows) {
          args.unshift("-n", options.niceness, command);
          command = "nice";
        }
        var stdoutRing = utils2.linesRing(maxLines);
        var stdoutClosed = false;
        var stderrRing = utils2.linesRing(maxLines);
        var stderrClosed = false;
        var ffmpegProc = spawn(command, args, options);
        if (ffmpegProc.stderr) {
          ffmpegProc.stderr.setEncoding("utf8");
        }
        ffmpegProc.on("error", function(err2) {
          endCB(err2);
        });
        var exitError = null;
        function handleExit(err2) {
          if (err2) {
            exitError = err2;
          }
          if (processExited && (stdoutClosed || !options.captureStdout) && stderrClosed) {
            endCB(exitError, stdoutRing, stderrRing);
          }
        }
        var processExited = false;
        ffmpegProc.on("exit", function(code, signal) {
          processExited = true;
          if (signal) {
            handleExit(new Error("ffmpeg was killed with signal " + signal));
          } else if (code) {
            handleExit(new Error("ffmpeg exited with code " + code));
          } else {
            handleExit();
          }
        });
        if (options.captureStdout) {
          ffmpegProc.stdout.on("data", function(data) {
            stdoutRing.append(data);
          });
          ffmpegProc.stdout.on("close", function() {
            stdoutRing.close();
            stdoutClosed = true;
            handleExit();
          });
        }
        ffmpegProc.stderr.on("data", function(data) {
          stderrRing.append(data);
        });
        ffmpegProc.stderr.on("close", function() {
          stderrRing.close();
          stderrClosed = true;
          handleExit();
        });
        processCB(ffmpegProc, stdoutRing, stderrRing);
      });
    };
    proto._getArguments = function() {
      var complexFilters = this._complexFilters.get();
      var fileOutput = this._outputs.some(function(output2) {
        return output2.isFile;
      });
      return [].concat(
        // Inputs and input options
        this._inputs.reduce(function(args, input) {
          var source = typeof input.source === "string" ? input.source : "pipe:0";
          return args.concat(
            input.options.get(),
            ["-i", source]
          );
        }, []),
        // Global options
        this._global.get(),
        // Overwrite if we have file outputs
        fileOutput ? ["-y"] : [],
        // Complex filters
        complexFilters,
        // Outputs, filters and output options
        this._outputs.reduce(function(args, output2) {
          var sizeFilters = utils2.makeFilterStrings(output2.sizeFilters.get());
          var audioFilters = output2.audioFilters.get();
          var videoFilters = output2.videoFilters.get().concat(sizeFilters);
          var outputArg;
          if (!output2.target) {
            outputArg = [];
          } else if (typeof output2.target === "string") {
            outputArg = [output2.target];
          } else {
            outputArg = ["pipe:1"];
          }
          return args.concat(
            output2.audio.get(),
            audioFilters.length ? ["-filter:a", audioFilters.join(",")] : [],
            output2.video.get(),
            videoFilters.length ? ["-filter:v", videoFilters.join(",")] : [],
            output2.options.get(),
            outputArg
          );
        }, [])
      );
    };
    proto._prepare = function(callback, readMetadata) {
      var self2 = this;
      async2.waterfall([
        // Check codecs and formats
        function(cb) {
          self2._checkCapabilities(cb);
        },
        // Read metadata if required
        function(cb) {
          if (!readMetadata) {
            return cb();
          }
          self2.ffprobe(0, function(err, data) {
            if (!err) {
              self2._ffprobeData = data;
            }
            cb();
          });
        },
        // Check for flvtool2/flvmeta if necessary
        function(cb) {
          var flvmeta = self2._outputs.some(function(output2) {
            if (output2.flags.flvmeta && !output2.isFile) {
              self2.logger.warn("Updating flv metadata is only supported for files");
              output2.flags.flvmeta = false;
            }
            return output2.flags.flvmeta;
          });
          if (flvmeta) {
            self2._getFlvtoolPath(function(err) {
              cb(err);
            });
          } else {
            cb();
          }
        },
        // Build argument list
        function(cb) {
          var args;
          try {
            args = self2._getArguments();
          } catch (e) {
            return cb(e);
          }
          cb(null, args);
        },
        // Add "-strict experimental" option where needed
        function(args, cb) {
          self2.availableEncoders(function(err, encoders) {
            for (var i = 0; i < args.length; i++) {
              if (args[i] === "-acodec" || args[i] === "-vcodec") {
                i++;
                if (args[i] in encoders && encoders[args[i]].experimental) {
                  args.splice(i + 1, 0, "-strict", "experimental");
                  i += 2;
                }
              }
            }
            cb(null, args);
          });
        }
      ], callback);
      if (!readMetadata) {
        if (this.listeners("progress").length > 0) {
          runFfprobe(this);
        } else {
          this.once("newListener", function(event) {
            if (event === "progress") {
              runFfprobe(this);
            }
          });
        }
      }
    };
    proto.exec = proto.execute = proto.run = function() {
      var self2 = this;
      var outputPresent = this._outputs.some(function(output2) {
        return "target" in output2;
      });
      if (!outputPresent) {
        throw new Error("No output specified");
      }
      var outputStream = this._outputs.filter(function(output2) {
        return typeof output2.target !== "string";
      })[0];
      var inputStream = this._inputs.filter(function(input) {
        return typeof input.source !== "string";
      })[0];
      var ended = false;
      function emitEnd(err, stdout, stderr) {
        if (!ended) {
          ended = true;
          if (err) {
            self2.emit("error", err, stdout, stderr);
          } else {
            self2.emit("end", stdout, stderr);
          }
        }
      }
      self2._prepare(function(err, args) {
        if (err) {
          return emitEnd(err);
        }
        self2._spawnFfmpeg(
          args,
          {
            captureStdout: !outputStream,
            niceness: self2.options.niceness,
            cwd: self2.options.cwd,
            windowsHide: true
          },
          function processCB(ffmpegProc, stdoutRing, stderrRing) {
            self2.ffmpegProc = ffmpegProc;
            self2.emit("start", "ffmpeg " + args.join(" "));
            if (inputStream) {
              inputStream.source.on("error", function(err2) {
                var reportingErr = new Error("Input stream error: " + err2.message);
                reportingErr.inputStreamError = err2;
                emitEnd(reportingErr);
                ffmpegProc.kill();
              });
              inputStream.source.resume();
              inputStream.source.pipe(ffmpegProc.stdin);
              ffmpegProc.stdin.on("error", function() {
              });
            }
            if (self2.options.timeout) {
              self2.processTimer = setTimeout(function() {
                var msg = "process ran into a timeout (" + self2.options.timeout + "s)";
                emitEnd(new Error(msg), stdoutRing.get(), stderrRing.get());
                ffmpegProc.kill();
              }, self2.options.timeout * 1e3);
            }
            if (outputStream) {
              ffmpegProc.stdout.pipe(outputStream.target, outputStream.pipeopts);
              outputStream.target.on("close", function() {
                self2.logger.debug("Output stream closed, scheduling kill for ffmpeg process");
                setTimeout(function() {
                  emitEnd(new Error("Output stream closed"));
                  ffmpegProc.kill();
                }, 20);
              });
              outputStream.target.on("error", function(err2) {
                self2.logger.debug("Output stream error, killing ffmpeg process");
                var reportingErr = new Error("Output stream error: " + err2.message);
                reportingErr.outputStreamError = err2;
                emitEnd(reportingErr, stdoutRing.get(), stderrRing.get());
                ffmpegProc.kill("SIGKILL");
              });
            }
            if (stderrRing) {
              if (self2.listeners("stderr").length) {
                stderrRing.callback(function(line) {
                  self2.emit("stderr", line);
                });
              }
              if (self2.listeners("codecData").length) {
                var codecDataSent = false;
                var codecObject = {};
                stderrRing.callback(function(line) {
                  if (!codecDataSent)
                    codecDataSent = utils2.extractCodecData(self2, line, codecObject);
                });
              }
              if (self2.listeners("progress").length) {
                stderrRing.callback(function(line) {
                  utils2.extractProgress(self2, line);
                });
              }
            }
          },
          function endCB(err2, stdoutRing, stderrRing) {
            clearTimeout(self2.processTimer);
            delete self2.ffmpegProc;
            if (err2) {
              if (err2.message.match(/ffmpeg exited with code/)) {
                err2.message += ": " + utils2.extractError(stderrRing.get());
              }
              emitEnd(err2, stdoutRing.get(), stderrRing.get());
            } else {
              var flvmeta = self2._outputs.filter(function(output2) {
                return output2.flags.flvmeta;
              });
              if (flvmeta.length) {
                self2._getFlvtoolPath(function(err3, flvtool) {
                  if (err3) {
                    return emitEnd(err3);
                  }
                  async2.each(
                    flvmeta,
                    function(output2, cb) {
                      spawn(flvtool, ["-U", output2.target], { windowsHide: true }).on("error", function(err4) {
                        cb(new Error("Error running " + flvtool + " on " + output2.target + ": " + err4.message));
                      }).on("exit", function(code, signal) {
                        if (code !== 0 || signal) {
                          cb(
                            new Error(flvtool + " " + (signal ? "received signal " + signal : "exited with code " + code)) + " when running on " + output2.target
                          );
                        } else {
                          cb();
                        }
                      });
                    },
                    function(err4) {
                      if (err4) {
                        emitEnd(err4);
                      } else {
                        emitEnd(null, stdoutRing.get(), stderrRing.get());
                      }
                    }
                  );
                });
              } else {
                emitEnd(null, stdoutRing.get(), stderrRing.get());
              }
            }
          }
        );
      });
      return this;
    };
    proto.renice = function(niceness) {
      if (!utils2.isWindows) {
        niceness = niceness || 0;
        if (niceness < -20 || niceness > 20) {
          this.logger.warn("Invalid niceness value: " + niceness + ", must be between -20 and 20");
        }
        niceness = Math.min(20, Math.max(-20, niceness));
        this.options.niceness = niceness;
        if (this.ffmpegProc) {
          var logger = this.logger;
          var pid = this.ffmpegProc.pid;
          var renice = spawn("renice", [niceness, "-p", pid], { windowsHide: true });
          renice.on("error", function(err) {
            logger.warn("could not renice process " + pid + ": " + err.message);
          });
          renice.on("exit", function(code, signal) {
            if (signal) {
              logger.warn("could not renice process " + pid + ": renice was killed by signal " + signal);
            } else if (code) {
              logger.warn("could not renice process " + pid + ": renice exited with " + code);
            } else {
              logger.info("successfully reniced process " + pid + " to " + niceness + " niceness");
            }
          });
        }
      }
      return this;
    };
    proto.kill = function(signal) {
      if (!this.ffmpegProc) {
        this.logger.warn("No running ffmpeg process, cannot send signal");
      } else {
        this.ffmpegProc.kill(signal || "SIGKILL");
      }
      return this;
    };
  };
  return processor;
}
var capabilities;
var hasRequiredCapabilities;
function requireCapabilities() {
  if (hasRequiredCapabilities) return capabilities;
  hasRequiredCapabilities = 1;
  var fs$1 = fs;
  var path2 = path$2;
  var async2 = requireAsync();
  var utils2 = utilsExports;
  var avCodecRegexp = /^\s*([D ])([E ])([VAS])([S ])([D ])([T ]) ([^ ]+) +(.*)$/;
  var ffCodecRegexp = /^\s*([D\.])([E\.])([VAS])([I\.])([L\.])([S\.]) ([^ ]+) +(.*)$/;
  var ffEncodersRegexp = /\(encoders:([^\)]+)\)/;
  var ffDecodersRegexp = /\(decoders:([^\)]+)\)/;
  var encodersRegexp = /^\s*([VAS\.])([F\.])([S\.])([X\.])([B\.])([D\.]) ([^ ]+) +(.*)$/;
  var formatRegexp = /^\s*([D ])([E ])\s+([^ ]+)\s+(.*)$/;
  var lineBreakRegexp = /\r\n|\r|\n/;
  var filterRegexp = /^(?: [T\.][S\.][C\.] )?([^ ]+) +(AA?|VV?|\|)->(AA?|VV?|\|) +(.*)$/;
  var cache = {};
  capabilities = function(proto) {
    proto.setFfmpegPath = function(ffmpegPath) {
      cache.ffmpegPath = ffmpegPath;
      return this;
    };
    proto.setFfprobePath = function(ffprobePath) {
      cache.ffprobePath = ffprobePath;
      return this;
    };
    proto.setFlvtoolPath = function(flvtool) {
      cache.flvtoolPath = flvtool;
      return this;
    };
    proto._forgetPaths = function() {
      delete cache.ffmpegPath;
      delete cache.ffprobePath;
      delete cache.flvtoolPath;
    };
    proto._getFfmpegPath = function(callback) {
      if ("ffmpegPath" in cache) {
        return callback(null, cache.ffmpegPath);
      }
      async2.waterfall([
        // Try FFMPEG_PATH
        function(cb) {
          if (process.env.FFMPEG_PATH) {
            fs$1.exists(process.env.FFMPEG_PATH, function(exists) {
              if (exists) {
                cb(null, process.env.FFMPEG_PATH);
              } else {
                cb(null, "");
              }
            });
          } else {
            cb(null, "");
          }
        },
        // Search in the PATH
        function(ffmpeg2, cb) {
          if (ffmpeg2.length) {
            return cb(null, ffmpeg2);
          }
          utils2.which("ffmpeg", function(err, ffmpeg22) {
            cb(err, ffmpeg22);
          });
        }
      ], function(err, ffmpeg2) {
        if (err) {
          callback(err);
        } else {
          callback(null, cache.ffmpegPath = ffmpeg2 || "");
        }
      });
    };
    proto._getFfprobePath = function(callback) {
      var self2 = this;
      if ("ffprobePath" in cache) {
        return callback(null, cache.ffprobePath);
      }
      async2.waterfall([
        // Try FFPROBE_PATH
        function(cb) {
          if (process.env.FFPROBE_PATH) {
            fs$1.exists(process.env.FFPROBE_PATH, function(exists) {
              cb(null, exists ? process.env.FFPROBE_PATH : "");
            });
          } else {
            cb(null, "");
          }
        },
        // Search in the PATH
        function(ffprobe2, cb) {
          if (ffprobe2.length) {
            return cb(null, ffprobe2);
          }
          utils2.which("ffprobe", function(err, ffprobe22) {
            cb(err, ffprobe22);
          });
        },
        // Search in the same directory as ffmpeg
        function(ffprobe2, cb) {
          if (ffprobe2.length) {
            return cb(null, ffprobe2);
          }
          self2._getFfmpegPath(function(err, ffmpeg2) {
            if (err) {
              cb(err);
            } else if (ffmpeg2.length) {
              var name = utils2.isWindows ? "ffprobe.exe" : "ffprobe";
              var ffprobe22 = path2.join(path2.dirname(ffmpeg2), name);
              fs$1.exists(ffprobe22, function(exists) {
                cb(null, exists ? ffprobe22 : "");
              });
            } else {
              cb(null, "");
            }
          });
        }
      ], function(err, ffprobe2) {
        if (err) {
          callback(err);
        } else {
          callback(null, cache.ffprobePath = ffprobe2 || "");
        }
      });
    };
    proto._getFlvtoolPath = function(callback) {
      if ("flvtoolPath" in cache) {
        return callback(null, cache.flvtoolPath);
      }
      async2.waterfall([
        // Try FLVMETA_PATH
        function(cb) {
          if (process.env.FLVMETA_PATH) {
            fs$1.exists(process.env.FLVMETA_PATH, function(exists) {
              cb(null, exists ? process.env.FLVMETA_PATH : "");
            });
          } else {
            cb(null, "");
          }
        },
        // Try FLVTOOL2_PATH
        function(flvtool, cb) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }
          if (process.env.FLVTOOL2_PATH) {
            fs$1.exists(process.env.FLVTOOL2_PATH, function(exists) {
              cb(null, exists ? process.env.FLVTOOL2_PATH : "");
            });
          } else {
            cb(null, "");
          }
        },
        // Search for flvmeta in the PATH
        function(flvtool, cb) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }
          utils2.which("flvmeta", function(err, flvmeta) {
            cb(err, flvmeta);
          });
        },
        // Search for flvtool2 in the PATH
        function(flvtool, cb) {
          if (flvtool.length) {
            return cb(null, flvtool);
          }
          utils2.which("flvtool2", function(err, flvtool2) {
            cb(err, flvtool2);
          });
        }
      ], function(err, flvtool) {
        if (err) {
          callback(err);
        } else {
          callback(null, cache.flvtoolPath = flvtool || "");
        }
      });
    };
    proto.availableFilters = proto.getAvailableFilters = function(callback) {
      if ("filters" in cache) {
        return callback(null, cache.filters);
      }
      this._spawnFfmpeg(["-filters"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split("\n");
        var data = {};
        var types = { A: "audio", V: "video", "|": "none" };
        lines.forEach(function(line) {
          var match = line.match(filterRegexp);
          if (match) {
            data[match[1]] = {
              description: match[4],
              input: types[match[2].charAt(0)],
              multipleInputs: match[2].length > 1,
              output: types[match[3].charAt(0)],
              multipleOutputs: match[3].length > 1
            };
          }
        });
        callback(null, cache.filters = data);
      });
    };
    proto.availableCodecs = proto.getAvailableCodecs = function(callback) {
      if ("codecs" in cache) {
        return callback(null, cache.codecs);
      }
      this._spawnFfmpeg(["-codecs"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data = {};
        lines.forEach(function(line) {
          var match = line.match(avCodecRegexp);
          if (match && match[7] !== "=") {
            data[match[7]] = {
              type: { "V": "video", "A": "audio", "S": "subtitle" }[match[3]],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              drawHorizBand: match[4] === "S",
              directRendering: match[5] === "D",
              weirdFrameTruncation: match[6] === "T"
            };
          }
          match = line.match(ffCodecRegexp);
          if (match && match[7] !== "=") {
            var codecData = data[match[7]] = {
              type: { "V": "video", "A": "audio", "S": "subtitle" }[match[3]],
              description: match[8],
              canDecode: match[1] === "D",
              canEncode: match[2] === "E",
              intraFrameOnly: match[4] === "I",
              isLossy: match[5] === "L",
              isLossless: match[6] === "S"
            };
            var encoders = codecData.description.match(ffEncodersRegexp);
            encoders = encoders ? encoders[1].trim().split(" ") : [];
            var decoders = codecData.description.match(ffDecodersRegexp);
            decoders = decoders ? decoders[1].trim().split(" ") : [];
            if (encoders.length || decoders.length) {
              var coderData = {};
              utils2.copy(codecData, coderData);
              delete coderData.canEncode;
              delete coderData.canDecode;
              encoders.forEach(function(name) {
                data[name] = {};
                utils2.copy(coderData, data[name]);
                data[name].canEncode = true;
              });
              decoders.forEach(function(name) {
                if (name in data) {
                  data[name].canDecode = true;
                } else {
                  data[name] = {};
                  utils2.copy(coderData, data[name]);
                  data[name].canDecode = true;
                }
              });
            }
          }
        });
        callback(null, cache.codecs = data);
      });
    };
    proto.availableEncoders = proto.getAvailableEncoders = function(callback) {
      if ("encoders" in cache) {
        return callback(null, cache.encoders);
      }
      this._spawnFfmpeg(["-encoders"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data = {};
        lines.forEach(function(line) {
          var match = line.match(encodersRegexp);
          if (match && match[7] !== "=") {
            data[match[7]] = {
              type: { "V": "video", "A": "audio", "S": "subtitle" }[match[1]],
              description: match[8],
              frameMT: match[2] === "F",
              sliceMT: match[3] === "S",
              experimental: match[4] === "X",
              drawHorizBand: match[5] === "B",
              directRendering: match[6] === "D"
            };
          }
        });
        callback(null, cache.encoders = data);
      });
    };
    proto.availableFormats = proto.getAvailableFormats = function(callback) {
      if ("formats" in cache) {
        return callback(null, cache.formats);
      }
      this._spawnFfmpeg(["-formats"], { captureStdout: true, stdoutLines: 0 }, function(err, stdoutRing) {
        if (err) {
          return callback(err);
        }
        var stdout = stdoutRing.get();
        var lines = stdout.split(lineBreakRegexp);
        var data = {};
        lines.forEach(function(line) {
          var match = line.match(formatRegexp);
          if (match) {
            match[3].split(",").forEach(function(format) {
              if (!(format in data)) {
                data[format] = {
                  description: match[4],
                  canDemux: false,
                  canMux: false
                };
              }
              if (match[1] === "D") {
                data[format].canDemux = true;
              }
              if (match[2] === "E") {
                data[format].canMux = true;
              }
            });
          }
        });
        callback(null, cache.formats = data);
      });
    };
    proto._checkCapabilities = function(callback) {
      var self2 = this;
      async2.waterfall([
        // Get available formats
        function(cb) {
          self2.availableFormats(cb);
        },
        // Check whether specified formats are available
        function(formats, cb) {
          var unavailable;
          unavailable = self2._outputs.reduce(function(fmts, output2) {
            var format = output2.options.find("-f", 1);
            if (format) {
              if (!(format[0] in formats) || !formats[format[0]].canMux) {
                fmts.push(format);
              }
            }
            return fmts;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Output format " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Output formats " + unavailable.join(", ") + " are not available"));
          }
          unavailable = self2._inputs.reduce(function(fmts, input) {
            var format = input.options.find("-f", 1);
            if (format) {
              if (!(format[0] in formats) || !formats[format[0]].canDemux) {
                fmts.push(format[0]);
              }
            }
            return fmts;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Input format " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Input formats " + unavailable.join(", ") + " are not available"));
          }
          cb();
        },
        // Get available codecs
        function(cb) {
          self2.availableEncoders(cb);
        },
        // Check whether specified codecs are available and add strict experimental options if needed
        function(encoders, cb) {
          var unavailable;
          unavailable = self2._outputs.reduce(function(cdcs, output2) {
            var acodec = output2.audio.find("-acodec", 1);
            if (acodec && acodec[0] !== "copy") {
              if (!(acodec[0] in encoders) || encoders[acodec[0]].type !== "audio") {
                cdcs.push(acodec[0]);
              }
            }
            return cdcs;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Audio codec " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Audio codecs " + unavailable.join(", ") + " are not available"));
          }
          unavailable = self2._outputs.reduce(function(cdcs, output2) {
            var vcodec = output2.video.find("-vcodec", 1);
            if (vcodec && vcodec[0] !== "copy") {
              if (!(vcodec[0] in encoders) || encoders[vcodec[0]].type !== "video") {
                cdcs.push(vcodec[0]);
              }
            }
            return cdcs;
          }, []);
          if (unavailable.length === 1) {
            return cb(new Error("Video codec " + unavailable[0] + " is not available"));
          } else if (unavailable.length > 1) {
            return cb(new Error("Video codecs " + unavailable.join(", ") + " are not available"));
          }
          cb();
        }
      ], callback);
    };
  };
  return capabilities;
}
var ffprobe;
var hasRequiredFfprobe;
function requireFfprobe() {
  if (hasRequiredFfprobe) return ffprobe;
  hasRequiredFfprobe = 1;
  var spawn = require$$0.spawn;
  function legacyTag(key) {
    return key.match(/^TAG:/);
  }
  function legacyDisposition(key) {
    return key.match(/^DISPOSITION:/);
  }
  function parseFfprobeOutput(out) {
    var lines = out.split(/\r\n|\r|\n/);
    lines = lines.filter(function(line2) {
      return line2.length > 0;
    });
    var data = {
      streams: [],
      format: {},
      chapters: []
    };
    function parseBlock(name) {
      var data2 = {};
      var line2 = lines.shift();
      while (typeof line2 !== "undefined") {
        if (line2.toLowerCase() == "[/" + name + "]") {
          return data2;
        } else if (line2.match(/^\[/)) {
          line2 = lines.shift();
          continue;
        }
        var kv = line2.match(/^([^=]+)=(.*)$/);
        if (kv) {
          if (!kv[1].match(/^TAG:/) && kv[2].match(/^[0-9]+(\.[0-9]+)?$/)) {
            data2[kv[1]] = Number(kv[2]);
          } else {
            data2[kv[1]] = kv[2];
          }
        }
        line2 = lines.shift();
      }
      return data2;
    }
    var line = lines.shift();
    while (typeof line !== "undefined") {
      if (line.match(/^\[stream/i)) {
        var stream = parseBlock("stream");
        data.streams.push(stream);
      } else if (line.match(/^\[chapter/i)) {
        var chapter = parseBlock("chapter");
        data.chapters.push(chapter);
      } else if (line.toLowerCase() === "[format]") {
        data.format = parseBlock("format");
      }
      line = lines.shift();
    }
    return data;
  }
  ffprobe = function(proto) {
    proto.ffprobe = function() {
      var input, index = null, options = [], callback;
      var callback = arguments[arguments.length - 1];
      var ended = false;
      function handleCallback(err, data) {
        if (!ended) {
          ended = true;
          callback(err, data);
        }
      }
      switch (arguments.length) {
        case 3:
          index = arguments[0];
          options = arguments[1];
          break;
        case 2:
          if (typeof arguments[0] === "number") {
            index = arguments[0];
          } else if (Array.isArray(arguments[0])) {
            options = arguments[0];
          }
          break;
      }
      if (index === null) {
        if (!this._currentInput) {
          return handleCallback(new Error("No input specified"));
        }
        input = this._currentInput;
      } else {
        input = this._inputs[index];
        if (!input) {
          return handleCallback(new Error("Invalid input index"));
        }
      }
      this._getFfprobePath(function(err, path2) {
        if (err) {
          return handleCallback(err);
        } else if (!path2) {
          return handleCallback(new Error("Cannot find ffprobe"));
        }
        var stdout = "";
        var stdoutClosed = false;
        var stderr = "";
        var stderrClosed = false;
        var src = input.isStream ? "pipe:0" : input.source;
        var ffprobe2 = spawn(path2, ["-show_streams", "-show_format"].concat(options, src), { windowsHide: true });
        if (input.isStream) {
          ffprobe2.stdin.on("error", function(err2) {
            if (["ECONNRESET", "EPIPE", "EOF"].indexOf(err2.code) >= 0) {
              return;
            }
            handleCallback(err2);
          });
          ffprobe2.stdin.on("close", function() {
            input.source.pause();
            input.source.unpipe(ffprobe2.stdin);
          });
          input.source.pipe(ffprobe2.stdin);
        }
        ffprobe2.on("error", callback);
        var exitError = null;
        function handleExit(err2) {
          if (err2) {
            exitError = err2;
          }
          if (processExited && stdoutClosed && stderrClosed) {
            if (exitError) {
              if (stderr) {
                exitError.message += "\n" + stderr;
              }
              return handleCallback(exitError);
            }
            var data = parseFfprobeOutput(stdout);
            [data.format].concat(data.streams).forEach(function(target) {
              if (target) {
                var legacyTagKeys = Object.keys(target).filter(legacyTag);
                if (legacyTagKeys.length) {
                  target.tags = target.tags || {};
                  legacyTagKeys.forEach(function(tagKey) {
                    target.tags[tagKey.substr(4)] = target[tagKey];
                    delete target[tagKey];
                  });
                }
                var legacyDispositionKeys = Object.keys(target).filter(legacyDisposition);
                if (legacyDispositionKeys.length) {
                  target.disposition = target.disposition || {};
                  legacyDispositionKeys.forEach(function(dispositionKey) {
                    target.disposition[dispositionKey.substr(12)] = target[dispositionKey];
                    delete target[dispositionKey];
                  });
                }
              }
            });
            handleCallback(null, data);
          }
        }
        var processExited = false;
        ffprobe2.on("exit", function(code, signal) {
          processExited = true;
          if (code) {
            handleExit(new Error("ffprobe exited with code " + code));
          } else if (signal) {
            handleExit(new Error("ffprobe was killed with signal " + signal));
          } else {
            handleExit();
          }
        });
        ffprobe2.stdout.on("data", function(data) {
          stdout += data;
        });
        ffprobe2.stdout.on("close", function() {
          stdoutClosed = true;
          handleExit();
        });
        ffprobe2.stderr.on("data", function(data) {
          stderr += data;
        });
        ffprobe2.stderr.on("close", function() {
          stderrClosed = true;
          handleExit();
        });
      });
    };
  };
  return ffprobe;
}
var recipes;
var hasRequiredRecipes;
function requireRecipes() {
  if (hasRequiredRecipes) return recipes;
  hasRequiredRecipes = 1;
  var fs$1 = fs;
  var path2 = path$2;
  var PassThrough = require$$2.PassThrough;
  var async2 = requireAsync();
  var utils2 = utilsExports;
  recipes = function recipes2(proto) {
    proto.saveToFile = proto.save = function(output2) {
      this.output(output2).run();
      return this;
    };
    proto.writeToStream = proto.pipe = proto.stream = function(stream, options) {
      if (stream && !("writable" in stream)) {
        options = stream;
        stream = void 0;
      }
      if (!stream) {
        if (process.version.match(/v0\.8\./)) {
          throw new Error("PassThrough stream is not supported on node v0.8");
        }
        stream = new PassThrough();
      }
      this.output(stream, options).run();
      return stream;
    };
    proto.takeScreenshots = proto.thumbnail = proto.thumbnails = proto.screenshot = proto.screenshots = function(config, folder) {
      var self2 = this;
      var source = this._currentInput.source;
      config = config || { count: 1 };
      if (typeof config === "number") {
        config = {
          count: config
        };
      }
      if (!("folder" in config)) {
        config.folder = folder || ".";
      }
      if ("timestamps" in config) {
        config.timemarks = config.timestamps;
      }
      if (!("timemarks" in config)) {
        if (!config.count) {
          throw new Error("Cannot take screenshots: neither a count nor a timemark list are specified");
        }
        var interval = 100 / (1 + config.count);
        config.timemarks = [];
        for (var i = 0; i < config.count; i++) {
          config.timemarks.push(interval * (i + 1) + "%");
        }
      }
      if ("size" in config) {
        var fixedSize = config.size.match(/^(\d+)x(\d+)$/);
        var fixedWidth = config.size.match(/^(\d+)x\?$/);
        var fixedHeight = config.size.match(/^\?x(\d+)$/);
        var percentSize = config.size.match(/^(\d+)%$/);
        if (!fixedSize && !fixedWidth && !fixedHeight && !percentSize) {
          throw new Error("Invalid size parameter: " + config.size);
        }
      }
      var metadata;
      function getMetadata(cb) {
        if (metadata) {
          cb(null, metadata);
        } else {
          self2.ffprobe(function(err, meta) {
            metadata = meta;
            cb(err, meta);
          });
        }
      }
      async2.waterfall([
        // Compute percent timemarks if any
        function computeTimemarks(next) {
          if (config.timemarks.some(function(t) {
            return ("" + t).match(/^[\d.]+%$/);
          })) {
            if (typeof source !== "string") {
              return next(new Error("Cannot compute screenshot timemarks with an input stream, please specify fixed timemarks"));
            }
            getMetadata(function(err, meta) {
              if (err) {
                next(err);
              } else {
                var vstream = meta.streams.reduce(function(biggest, stream) {
                  if (stream.codec_type === "video" && stream.width * stream.height > biggest.width * biggest.height) {
                    return stream;
                  } else {
                    return biggest;
                  }
                }, { width: 0, height: 0 });
                if (vstream.width === 0) {
                  return next(new Error("No video stream in input, cannot take screenshots"));
                }
                var duration = Number(vstream.duration);
                if (isNaN(duration)) {
                  duration = Number(meta.format.duration);
                }
                if (isNaN(duration)) {
                  return next(new Error("Could not get input duration, please specify fixed timemarks"));
                }
                config.timemarks = config.timemarks.map(function(mark) {
                  if (("" + mark).match(/^([\d.]+)%$/)) {
                    return duration * parseFloat(mark) / 100;
                  } else {
                    return mark;
                  }
                });
                next();
              }
            });
          } else {
            next();
          }
        },
        // Turn all timemarks into numbers and sort them
        function normalizeTimemarks(next) {
          config.timemarks = config.timemarks.map(function(mark) {
            return utils2.timemarkToSeconds(mark);
          }).sort(function(a, b) {
            return a - b;
          });
          next();
        },
        // Add '_%i' to pattern when requesting multiple screenshots and no variable token is present
        function fixPattern(next) {
          var pattern = config.filename || "tn.png";
          if (pattern.indexOf(".") === -1) {
            pattern += ".png";
          }
          if (config.timemarks.length > 1 && !pattern.match(/%(s|0*i)/)) {
            var ext = path2.extname(pattern);
            pattern = path2.join(path2.dirname(pattern), path2.basename(pattern, ext) + "_%i" + ext);
          }
          next(null, pattern);
        },
        // Replace filename tokens (%f, %b) in pattern
        function replaceFilenameTokens(pattern, next) {
          if (pattern.match(/%[bf]/)) {
            if (typeof source !== "string") {
              return next(new Error("Cannot replace %f or %b when using an input stream"));
            }
            pattern = pattern.replace(/%f/g, path2.basename(source)).replace(/%b/g, path2.basename(source, path2.extname(source)));
          }
          next(null, pattern);
        },
        // Compute size if needed
        function getSize(pattern, next) {
          if (pattern.match(/%[whr]/)) {
            if (fixedSize) {
              return next(null, pattern, fixedSize[1], fixedSize[2]);
            }
            getMetadata(function(err, meta) {
              if (err) {
                return next(new Error("Could not determine video resolution to replace %w, %h or %r"));
              }
              var vstream = meta.streams.reduce(function(biggest, stream) {
                if (stream.codec_type === "video" && stream.width * stream.height > biggest.width * biggest.height) {
                  return stream;
                } else {
                  return biggest;
                }
              }, { width: 0, height: 0 });
              if (vstream.width === 0) {
                return next(new Error("No video stream in input, cannot replace %w, %h or %r"));
              }
              var width = vstream.width;
              var height = vstream.height;
              if (fixedWidth) {
                height = height * Number(fixedWidth[1]) / width;
                width = Number(fixedWidth[1]);
              } else if (fixedHeight) {
                width = width * Number(fixedHeight[1]) / height;
                height = Number(fixedHeight[1]);
              } else if (percentSize) {
                width = width * Number(percentSize[1]) / 100;
                height = height * Number(percentSize[1]) / 100;
              }
              next(null, pattern, Math.round(width / 2) * 2, Math.round(height / 2) * 2);
            });
          } else {
            next(null, pattern, -1, -1);
          }
        },
        // Replace size tokens (%w, %h, %r) in pattern
        function replaceSizeTokens(pattern, width, height, next) {
          pattern = pattern.replace(/%r/g, "%wx%h").replace(/%w/g, width).replace(/%h/g, height);
          next(null, pattern);
        },
        // Replace variable tokens in pattern (%s, %i) and generate filename list
        function replaceVariableTokens(pattern, next) {
          var filenames = config.timemarks.map(function(t, i2) {
            return pattern.replace(/%s/g, utils2.timemarkToSeconds(t)).replace(/%(0*)i/g, function(match, padding) {
              var idx = "" + (i2 + 1);
              return padding.substr(0, Math.max(0, padding.length + 1 - idx.length)) + idx;
            });
          });
          self2.emit("filenames", filenames);
          next(null, filenames);
        },
        // Create output directory
        function createDirectory(filenames, next) {
          fs$1.exists(config.folder, function(exists) {
            if (!exists) {
              fs$1.mkdir(config.folder, function(err) {
                if (err) {
                  next(err);
                } else {
                  next(null, filenames);
                }
              });
            } else {
              next(null, filenames);
            }
          });
        }
      ], function runCommand(err, filenames) {
        if (err) {
          return self2.emit("error", err);
        }
        var count = config.timemarks.length;
        var split;
        var filters = [split = {
          filter: "split",
          options: count,
          outputs: []
        }];
        if ("size" in config) {
          self2.size(config.size);
          var sizeFilters = self2._currentOutput.sizeFilters.get().map(function(f, i3) {
            if (i3 > 0) {
              f.inputs = "size" + (i3 - 1);
            }
            f.outputs = "size" + i3;
            return f;
          });
          split.inputs = "size" + (sizeFilters.length - 1);
          filters = sizeFilters.concat(filters);
          self2._currentOutput.sizeFilters.clear();
        }
        var first = 0;
        for (var i2 = 0; i2 < count; i2++) {
          var stream = "screen" + i2;
          split.outputs.push(stream);
          if (i2 === 0) {
            first = config.timemarks[i2];
            self2.seekInput(first);
          }
          self2.output(path2.join(config.folder, filenames[i2])).frames(1).map(stream);
          if (i2 > 0) {
            self2.seek(config.timemarks[i2] - first);
          }
        }
        self2.complexFilter(filters);
        self2.run();
      });
      return this;
    };
    proto.mergeToFile = proto.concatenate = proto.concat = function(target, options) {
      var fileInput = this._inputs.filter(function(input) {
        return !input.isStream;
      })[0];
      var self2 = this;
      this.ffprobe(this._inputs.indexOf(fileInput), function(err, data) {
        if (err) {
          return self2.emit("error", err);
        }
        var hasAudioStreams = data.streams.some(function(stream) {
          return stream.codec_type === "audio";
        });
        var hasVideoStreams = data.streams.some(function(stream) {
          return stream.codec_type === "video";
        });
        self2.output(target, options).complexFilter({
          filter: "concat",
          options: {
            n: self2._inputs.length,
            v: hasVideoStreams ? 1 : 0,
            a: hasAudioStreams ? 1 : 0
          }
        }).run();
      });
      return this;
    };
  };
  return recipes;
}
var path = path$2;
var util = require$$1$1;
var EventEmitter = require$$2$1.EventEmitter;
var utils = utilsExports;
function FfmpegCommand(input, options) {
  if (!(this instanceof FfmpegCommand)) {
    return new FfmpegCommand(input, options);
  }
  EventEmitter.call(this);
  if (typeof input === "object" && !("readable" in input)) {
    options = input;
  } else {
    options = options || {};
    options.source = input;
  }
  this._inputs = [];
  if (options.source) {
    this.input(options.source);
  }
  this._outputs = [];
  this.output();
  var self2 = this;
  ["_global", "_complexFilters"].forEach(function(prop) {
    self2[prop] = utils.args();
  });
  options.stdoutLines = "stdoutLines" in options ? options.stdoutLines : 100;
  options.presets = options.presets || options.preset || path.join(__dirname, "presets");
  options.niceness = options.niceness || options.priority || 0;
  this.options = options;
  this.logger = options.logger || {
    debug: function() {
    },
    info: function() {
    },
    warn: function() {
    },
    error: function() {
    }
  };
}
util.inherits(FfmpegCommand, EventEmitter);
var fluentFfmpeg$1 = FfmpegCommand;
FfmpegCommand.prototype.clone = function() {
  var clone = new FfmpegCommand();
  var self2 = this;
  clone.options = this.options;
  clone.logger = this.logger;
  clone._inputs = this._inputs.map(function(input) {
    return {
      source: input.source,
      options: input.options.clone()
    };
  });
  if ("target" in this._outputs[0]) {
    clone._outputs = [];
    clone.output();
  } else {
    clone._outputs = [
      clone._currentOutput = {
        flags: {}
      }
    ];
    ["audio", "audioFilters", "video", "videoFilters", "sizeFilters", "options"].forEach(function(key) {
      clone._currentOutput[key] = self2._currentOutput[key].clone();
    });
    if (this._currentOutput.sizeData) {
      clone._currentOutput.sizeData = {};
      utils.copy(this._currentOutput.sizeData, clone._currentOutput.sizeData);
    }
    utils.copy(this._currentOutput.flags, clone._currentOutput.flags);
  }
  ["_global", "_complexFilters"].forEach(function(prop) {
    clone[prop] = self2[prop].clone();
  });
  return clone;
};
requireInputs()(FfmpegCommand.prototype);
requireAudio()(FfmpegCommand.prototype);
requireVideo()(FfmpegCommand.prototype);
requireVideosize()(FfmpegCommand.prototype);
requireOutput()(FfmpegCommand.prototype);
requireCustom()(FfmpegCommand.prototype);
requireMisc()(FfmpegCommand.prototype);
requireProcessor()(FfmpegCommand.prototype);
requireCapabilities()(FfmpegCommand.prototype);
FfmpegCommand.setFfmpegPath = function(path2) {
  new FfmpegCommand().setFfmpegPath(path2);
};
FfmpegCommand.setFfprobePath = function(path2) {
  new FfmpegCommand().setFfprobePath(path2);
};
FfmpegCommand.setFlvtoolPath = function(path2) {
  new FfmpegCommand().setFlvtoolPath(path2);
};
FfmpegCommand.availableFilters = FfmpegCommand.getAvailableFilters = function(callback) {
  new FfmpegCommand().availableFilters(callback);
};
FfmpegCommand.availableCodecs = FfmpegCommand.getAvailableCodecs = function(callback) {
  new FfmpegCommand().availableCodecs(callback);
};
FfmpegCommand.availableFormats = FfmpegCommand.getAvailableFormats = function(callback) {
  new FfmpegCommand().availableFormats(callback);
};
FfmpegCommand.availableEncoders = FfmpegCommand.getAvailableEncoders = function(callback) {
  new FfmpegCommand().availableEncoders(callback);
};
requireFfprobe()(FfmpegCommand.prototype);
FfmpegCommand.ffprobe = function(file) {
  var instance = new FfmpegCommand(file);
  instance.ffprobe.apply(instance, Array.prototype.slice.call(arguments, 1));
};
requireRecipes()(FfmpegCommand.prototype);
var fluentFfmpeg = fluentFfmpeg$1;
const ffmpeg = /* @__PURE__ */ getDefaultExportFromCjs(fluentFfmpeg);
const defaultSettings = {
  replayBufferDuration: 30,
  replayBufferMaxSize: 512,
  videoBitrate: 24e3,
  videoEncoder: "jim_nvenc_h264",
  // Default to NVENC
  encoderPreset: "performance",
  // Default to lowest GPU usage
  fps: 60,
  captureResolution: "native",
  // Default to native monitor resolution
  outputResolution: "native",
  // Default to native monitor resolution
  customCaptureResolution: { width: 1920, height: 1080 },
  customOutputResolution: { width: 1920, height: 1080 },
  recordingFormat: "mp4",
  recordingPath: "",
  // Will be set on first run
  captureDesktopAudio: true,
  captureMicrophone: true,
  replayHotkey: "Alt+F10",
  monitor1Hotkey: "Alt+F11",
  monitor2Hotkey: "Alt+F12",
  allMonitorsHotkey: "Alt+Delete",
  enabledMonitors: void 0
};
const _SettingsManager = class _SettingsManager {
  constructor() {
    __publicField(this, "settings");
    __publicField(this, "settingsPath");
    const userDataPath = app.getPath("userData");
    this.settingsPath = path$2.join(userDataPath, "luminreplay-settings.json");
    this.settings = this.loadSettings();
    if (!this.settings.recordingPath) {
      const videosPath = app.getPath("videos");
      this.settings.recordingPath = path$2.join(videosPath, "LuminReplay");
      this.saveSettings();
    }
    this.initIPC();
  }
  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, "utf-8");
        const loaded = JSON.parse(data);
        return { ...defaultSettings, ...loaded };
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    return { ...defaultSettings };
  }
  saveSettings() {
    try {
      const dir = path$2.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }
  static getInstance() {
    if (!_SettingsManager.instance) {
      _SettingsManager.instance = new _SettingsManager();
    }
    return _SettingsManager.instance;
  }
  initIPC() {
    ipcMain.handle("settings-get-all", () => {
      return this.getAllSettings();
    });
    ipcMain.handle("settings-get", (_, key) => {
      return this.getSetting(key);
    });
    ipcMain.handle("settings-set", (_, key, value) => {
      return this.setSetting(key, value);
    });
    ipcMain.handle("settings-set-multiple", (_, settings) => {
      return this.setMultipleSettings(settings);
    });
    ipcMain.handle("settings-reset", () => {
      return this.resetToDefaults();
    });
    ipcMain.handle("settings-pick-folder", async () => {
      const result = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select Recording Folder"
      });
      if (!result.canceled && result.filePaths.length > 0) {
        this.setSetting("recordingPath", result.filePaths[0]);
        return result.filePaths[0];
      }
      return null;
    });
  }
  getAllSettings() {
    return { ...this.settings };
  }
  getSetting(key) {
    return this.settings[key];
  }
  setSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    return { ...this.settings };
  }
  setMultipleSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (key in defaultSettings) {
        this.settings[key] = value;
      }
    }
    this.saveSettings();
    return { ...this.settings };
  }
  resetToDefaults() {
    const currentPath = this.settings.recordingPath;
    this.settings = { ...defaultSettings, recordingPath: currentPath };
    this.saveSettings();
    return { ...this.settings };
  }
};
__publicField(_SettingsManager, "instance");
let SettingsManager = _SettingsManager;
const require$1 = createRequire(import.meta.url);
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$2 = path$2.dirname(__filename$1);
globalThis.__dirname = __dirname$2;
globalThis.__filename = __filename$1;
let obs;
try {
  obs = require$1("obs-studio-node");
} catch (e) {
  console.error("Failed to load obs-studio-node. Make sure it is installed and built.", e);
}
const _OBSManager = class _OBSManager {
  constructor() {
    __publicField(this, "initialized", false);
    __publicField(this, "replayBufferRunning", false);
    __publicField(this, "isRestarting", false);
    // Flag to track intentional restart
    __publicField(this, "pendingStopResolve", null);
    // Promise resolver for stop signal
    __publicField(this, "pendingReplaySave", null);
    __publicField(this, "lastReplayPath", null);
    this.initIPC();
  }
  static getInstance() {
    if (!_OBSManager.instance) {
      _OBSManager.instance = new _OBSManager();
    }
    return _OBSManager.instance;
  }
  initIPC() {
    ipcMain.handle("obs-save-replay", async () => {
      return await this.saveReplayBuffer();
    });
    ipcMain.handle("obs-restart", async () => {
      console.log("Restarting OBS with new settings...");
      await this.restartWithNewSettings();
      return { success: true };
    });
  }
  /**
   * Restart the replay buffer with new settings
   */
  async restartWithNewSettings() {
    if (!this.initialized || !obs) return;
    this.isRestarting = true;
    if (this.replayBufferRunning) {
      console.log("Stopping replay buffer for settings update...");
      const stopPromise = new Promise((resolve) => {
        this.pendingStopResolve = resolve;
      });
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.log("Stop signal timeout, proceeding anyway...");
          resolve();
        }, 2e3);
      });
      obs.NodeObs.OBS_service_stopReplayBuffer(false);
      await Promise.race([stopPromise, timeoutPromise]);
      this.pendingStopResolve = null;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    this.setupVideo();
    this.setupOutput();
    this.setupScene();
    this.startReplayBuffer();
    this.isRestarting = false;
  }
  initialize() {
    if (this.initialized || !obs) return;
    console.log("Initializing OBS...");
    obs.NodeObs.IPC.host(`luminreplay-${process.pid}`);
    const obsPath = path$2.join(process.cwd(), "node_modules", "obs-studio-node");
    obs.NodeObs.SetWorkingDirectory(obsPath);
    const userDataPath = app.getPath("userData");
    const obsDataPath = path$2.join(userDataPath, "osn-data");
    if (!fs.existsSync(obsDataPath)) {
      fs.mkdirSync(obsDataPath, { recursive: true });
    }
    const initResult = obs.NodeObs.OBS_API_initAPI("en-US", obsDataPath, "1.0.0");
    console.log("OBS Init Result:", initResult);
    if (initResult === 0) {
      this.initialized = true;
      this.setupOutputSignals();
      this.setupVideo();
      this.setupOutput();
      this.setupScene();
      this.startReplayBuffer();
    }
  }
  /**
   * Connect to OBS output signals for async callbacks
   */
  setupOutputSignals() {
    if (!obs) return;
    obs.NodeObs.OBS_service_connectOutputSignals((signalInfo) => {
      this.handleOutputSignal(signalInfo);
    });
  }
  /**
   * Handle OBS output signals (recording, streaming, replay buffer)
   */
  handleOutputSignal(signalInfo) {
    console.log("OBS Output Signal:", JSON.stringify(signalInfo, null, 2));
    if (signalInfo.type === "replay-buffer") {
      switch (signalInfo.signal) {
        case "start":
          console.log("Replay buffer started");
          this.replayBufferRunning = true;
          break;
        case "stop":
          console.log("Replay buffer stopped");
          if (this.pendingStopResolve) {
            this.pendingStopResolve();
          } else if (!this.isRestarting) {
            this.replayBufferRunning = false;
          }
          break;
        case "wrote":
          try {
            let replayPath = obs.NodeObs.OBS_service_getLastReplay();
            console.log("Replay saved to:", replayPath);
            const fileName = path$2.basename(replayPath);
            if (fileName.startsWith("Replay")) {
              const dir = path$2.dirname(replayPath);
              const newFileName = fileName.replace("Replay", "LuminReplay");
              const newPath = path$2.join(dir, newFileName);
              try {
                fs.renameSync(replayPath, newPath);
                console.log("Renamed replay to:", newPath);
                replayPath = newPath;
              } catch (renameErr) {
                console.error("Error renaming replay file:", renameErr);
              }
            }
            this.lastReplayPath = replayPath;
            if (this.pendingReplaySave) {
              this.pendingReplaySave.resolve(replayPath);
              this.pendingReplaySave = null;
            }
          } catch (err) {
            console.error("Error getting last replay path:", err);
            if (this.pendingReplaySave) {
              this.pendingReplaySave.reject(new Error("Failed to get replay path"));
              this.pendingReplaySave = null;
            }
          }
          break;
        case "writing_error":
          console.error("Replay buffer write error:", signalInfo.error);
          if (this.pendingReplaySave) {
            this.pendingReplaySave.reject(new Error(signalInfo.error || "Write error"));
            this.pendingReplaySave = null;
          }
          break;
      }
    }
  }
  setupVideo() {
    if (!this.initialized) return;
    const settings = SettingsManager.getInstance().getAllSettings();
    const allDisplays = screen.getAllDisplays();
    const displays = allDisplays.filter((_, i) => {
      if (!settings.enabledMonitors) return true;
      return settings.enabledMonitors.includes(i);
    });
    if (displays.length === 0) {
      console.warn("No monitors enabled, using all displays");
      displays.push(...allDisplays);
    }
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    displays.forEach((d, i) => {
      if (i === 0 || d.bounds.x < minX) minX = d.bounds.x;
      if (i === 0 || d.bounds.y < minY) minY = d.bounds.y;
      if (i === 0 || d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
      if (i === 0 || d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
    });
    const nativeWidth = maxX - minX;
    const nativeHeight = maxY - minY;
    const getResolutionFromPreset = (preset, customRes, nativeW, nativeH) => {
      switch (preset) {
        case "1080p": {
          const scale = 1080 / nativeH;
          return { width: Math.round(nativeW * scale), height: 1080 };
        }
        case "720p": {
          const scale = 720 / nativeH;
          return { width: Math.round(nativeW * scale), height: 720 };
        }
        case "480p": {
          const scale = 480 / nativeH;
          return { width: Math.round(nativeW * scale), height: 480 };
        }
        case "custom":
          return customRes || { width: 1920, height: 1080 };
        case "native":
        default:
          return { width: nativeW, height: nativeH };
      }
    };
    const captureRes = getResolutionFromPreset(
      settings.captureResolution,
      settings.customCaptureResolution,
      nativeWidth,
      nativeHeight
    );
    const outputRes = getResolutionFromPreset(
      settings.outputResolution,
      settings.customOutputResolution,
      nativeWidth,
      nativeHeight
    );
    console.log(`Configuring OBS Video:`);
    console.log(`  Native: ${nativeWidth}x${nativeHeight}`);
    console.log(`  Capture (Base): ${captureRes.width}x${captureRes.height} (${settings.captureResolution})`);
    console.log(`  Output: ${outputRes.width}x${outputRes.height} (${settings.outputResolution})`);
    console.log(`  FPS: ${settings.fps} (${displays.length} monitor(s))`);
    try {
      const videoSettingsResult = obs.NodeObs.OBS_settings_getSettings("Video");
      const videoSettings = (videoSettingsResult == null ? void 0 : videoSettingsResult.data) || [];
      const updateSetting = (settingsArr, paramName, value) => {
        for (const category of settingsArr) {
          if (category.parameters) {
            for (const param of category.parameters) {
              if (param.name === paramName) {
                param.currentValue = value;
                param.value = value;
                return true;
              }
            }
          }
        }
        return false;
      };
      updateSetting(videoSettings, "Base", `${captureRes.width}x${captureRes.height}`);
      updateSetting(videoSettings, "Output", `${outputRes.width}x${outputRes.height}`);
      updateSetting(videoSettings, "FPSType", "Common FPS Values");
      updateSetting(videoSettings, "FPSCommon", String(settings.fps));
      obs.NodeObs.OBS_settings_saveSettings("Video", videoSettings);
      console.log("Video settings configured successfully");
      const audioSettingsResult = obs.NodeObs.OBS_settings_getSettings("Audio");
      const audioSettings = (audioSettingsResult == null ? void 0 : audioSettingsResult.data) || [];
      updateSetting(audioSettings, "SampleRate", 44100);
      updateSetting(audioSettings, "ChannelSetup", "Stereo");
      obs.NodeObs.OBS_settings_saveSettings("Audio", audioSettings);
      console.log("Audio settings configured successfully");
    } catch (error) {
      console.error("Error configuring OBS settings:", error);
    }
  }
  /**
   * Configure output settings for replay buffer
   */
  setupOutput() {
    var _a, _b;
    if (!this.initialized || !obs) return;
    const settings = SettingsManager.getInstance().getAllSettings();
    console.log("Configuring output settings...");
    console.log(`  - Replay Buffer Duration: ${settings.replayBufferDuration}s`);
    console.log(`  - Replay Buffer Max Size: ${settings.replayBufferMaxSize}MB`);
    console.log(`  - Video Bitrate: ${settings.videoBitrate} kbps (${(settings.videoBitrate / 1e3).toFixed(1)} Mbps)`);
    console.log(`  - Recording Format: ${settings.recordingFormat}`);
    console.log(`  - Recording Path: ${settings.recordingPath}`);
    try {
      const outputSettingsResult = obs.NodeObs.OBS_settings_getSettings("Output");
      const outputSettings = (outputSettingsResult == null ? void 0 : outputSettingsResult.data) || [];
      const updateSetting = (settingsArr, paramName, value) => {
        for (const category of settingsArr) {
          if (category.parameters) {
            for (const param of category.parameters) {
              if (param.name === paramName) {
                console.log(`    [UPDATE] ${paramName}: ${param.currentValue} -> ${value}`);
                param.currentValue = value;
                param.value = value;
                return true;
              }
            }
          }
        }
        console.log(`    [NOT FOUND] ${paramName}`);
        return false;
      };
      updateSetting(outputSettings, "Mode", "Advanced");
      obs.NodeObs.OBS_settings_saveSettings("Output", outputSettings);
      let advancedSettings = ((_a = obs.NodeObs.OBS_settings_getSettings("Output")) == null ? void 0 : _a.data) || [];
      const recordingPath = settings.recordingPath || path$2.join(app.getPath("videos"), "LuminReplay");
      if (!fs.existsSync(recordingPath)) {
        fs.mkdirSync(recordingPath, { recursive: true });
      }
      updateSetting(advancedSettings, "RecFilePath", recordingPath);
      updateSetting(advancedSettings, "RecFormat", settings.recordingFormat);
      updateSetting(advancedSettings, "RecType", "Standard");
      let advancedEncoder = settings.videoEncoder;
      if (settings.videoEncoder === "jim_nvenc_h264") {
        advancedEncoder = "jim_nvenc";
      } else if (settings.videoEncoder === "x264") {
        advancedEncoder = "obs_x264";
      }
      console.log(`  - Setting encoder: ${advancedEncoder} (from ${settings.videoEncoder})`);
      updateSetting(advancedSettings, "RecEncoder", advancedEncoder);
      obs.NodeObs.OBS_settings_saveSettings("Output", advancedSettings);
      advancedSettings = ((_b = obs.NodeObs.OBS_settings_getSettings("Output")) == null ? void 0 : _b.data) || [];
      console.log("=== Recording settings after encoder selection ===");
      for (const category of advancedSettings) {
        if (category.nameSubCategory === "Recording") {
          if (category.parameters) {
            for (const param of category.parameters) {
              console.log(`  - ${param.name}: ${param.currentValue}`);
            }
          }
        }
      }
      console.log("=== END ===");
      console.log(`  - Setting rate control to CQP for efficiency`);
      updateSetting(advancedSettings, "Recrate_control", "CQP");
      const cqpValues = {
        "performance": 23,
        // Lighter encoding, smaller files
        "balanced": 21,
        // Good balance
        "quality": 18
        // Best quality, larger files
      };
      const cqp = cqpValues[settings.encoderPreset] || 21;
      console.log(`  - Setting CQP to ${cqp} (preset: ${settings.encoderPreset})`);
      updateSetting(advancedSettings, "Reccqp", cqp);
      updateSetting(advancedSettings, "Recmax_bitrate", settings.videoBitrate);
      const presetMap = {
        "performance": "p1",
        // Fastest, lowest GPU usage (like ShadowPlay)
        "balanced": "p4",
        // Middle ground
        "quality": "p7"
        // Best quality, highest GPU usage
      };
      const nvencPreset = presetMap[settings.encoderPreset] || "p1";
      console.log(`  - Setting NVENC preset to ${nvencPreset}`);
      updateSetting(advancedSettings, "Recpreset", nvencPreset);
      if (settings.encoderPreset === "performance") {
        updateSetting(advancedSettings, "Reclookahead", false);
        updateSetting(advancedSettings, "Recpsycho_aq", false);
        updateSetting(advancedSettings, "Recbframes", 0);
      } else if (settings.encoderPreset === "balanced") {
        updateSetting(advancedSettings, "Reclookahead", false);
        updateSetting(advancedSettings, "Recpsycho_aq", true);
        updateSetting(advancedSettings, "Recbframes", 0);
      } else {
        updateSetting(advancedSettings, "Reclookahead", true);
        updateSetting(advancedSettings, "Recpsycho_aq", true);
        updateSetting(advancedSettings, "Recbframes", 2);
      }
      updateSetting(advancedSettings, "RecRB", true);
      updateSetting(advancedSettings, "RecRBTime", settings.replayBufferDuration);
      obs.NodeObs.OBS_settings_saveSettings("Output", advancedSettings);
      console.log("Output settings configured. Replay path:", recordingPath);
    } catch (error) {
      console.error("Error configuring output settings:", error);
    }
  }
  setupScene() {
    if (!this.initialized || !obs) return;
    console.log("Setting up scene...");
    try {
      const sceneName = `MegaCanvas-${Date.now()}`;
      const scene = obs.SceneFactory.create(sceneName);
      console.log(`Created scene: ${sceneName}`);
      const allDisplays = screen.getAllDisplays();
      const settings = SettingsManager.getInstance().getAllSettings();
      const enabledMonitors = settings.enabledMonitors;
      const displays = allDisplays.filter((_, i) => {
        if (!enabledMonitors) return true;
        return enabledMonitors.includes(i);
      });
      if (displays.length === 0) {
        console.warn("No monitors enabled, using all displays for scene");
        displays.push(...allDisplays);
      }
      let minX = 0, minY = 0, maxX = 0, maxY = 0;
      displays.forEach((d, i) => {
        if (i === 0 || d.bounds.x < minX) minX = d.bounds.x;
        if (i === 0 || d.bounds.y < minY) minY = d.bounds.y;
        if (i === 0 || d.bounds.x + d.bounds.width > maxX) maxX = d.bounds.x + d.bounds.width;
        if (i === 0 || d.bounds.y + d.bounds.height > maxY) maxY = d.bounds.y + d.bounds.height;
      });
      const nativeWidth = maxX - minX;
      const nativeHeight = maxY - minY;
      const getResolutionFromPreset = (preset, customRes, nativeW, nativeH) => {
        switch (preset) {
          case "1080p": {
            const scale = 1080 / nativeH;
            return { width: Math.round(nativeW * scale), height: 1080 };
          }
          case "720p": {
            const scale = 720 / nativeH;
            return { width: Math.round(nativeW * scale), height: 720 };
          }
          case "480p": {
            const scale = 480 / nativeH;
            return { width: Math.round(nativeW * scale), height: 480 };
          }
          case "custom":
            return customRes || { width: 1920, height: 1080 };
          case "native":
          default:
            return { width: nativeW, height: nativeH };
        }
      };
      const captureRes = getResolutionFromPreset(
        settings.captureResolution,
        settings.customCaptureResolution,
        nativeWidth,
        nativeHeight
      );
      const scaleX = captureRes.width / nativeWidth;
      const scaleY = captureRes.height / nativeHeight;
      console.log(`Scene scaling: Native ${nativeWidth}x${nativeHeight} -> Capture ${captureRes.width}x${captureRes.height}`);
      console.log(`  Scale factors: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
      allDisplays.forEach((display, index) => {
        if (enabledMonitors && !enabledMonitors.includes(index)) {
          console.log(`Skipping Monitor-${index} (disabled in settings)`);
          return;
        }
        const sourceName = `Monitor-${index}`;
        console.log(`Creating source ${sourceName} for display ${display.id}`);
        try {
          const inputSettings = {
            monitor: index,
            capture_cursor: true,
            // Use DXGI duplication for more efficient capture
            // (This is the default on Windows 8+, but explicitly set)
            method: 0
            // 0 = Auto (DXGI on Win8+), 1 = WGC, 2 = DXGI
          };
          let input = obs.InputFactory.create("monitor_capture", sourceName, inputSettings);
          if (!input) {
            try {
              input = obs.InputFactory.fromName(sourceName);
            } catch (e) {
              console.warn(`Could not retrieve existing input ${sourceName}`, e);
            }
          }
          if (input) {
            console.log(`Got input: ${sourceName}, dimensions: ${input.width}x${input.height}`);
            const sceneItem = scene.add(input);
            if (sceneItem) {
              const posX = (display.bounds.x - minX) * scaleX;
              const posY = (display.bounds.y - minY) * scaleY;
              sceneItem.position = { x: posX, y: posY };
              if (scaleX !== 1 || scaleY !== 1) {
                sceneItem.scale = { x: scaleX, y: scaleY };
                console.log(`Positioned ${sourceName} at (${posX.toFixed(0)}, ${posY.toFixed(0)}) with scale ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
              } else {
                console.log(`Positioned ${sourceName} at (${posX}, ${posY})`);
              }
            } else {
              console.error(`Failed to add ${sourceName} to scene`);
            }
          } else {
            console.error(`Failed to create or retrieve input for monitor ${index}`);
          }
        } catch (sourceError) {
          console.error(`Error handling source for monitor ${index}:`, sourceError);
        }
      });
      try {
        const daName = "Desktop Audio";
        let desktopAudio = obs.InputFactory.create("wasapi_output_capture", daName, { device_id: "default" });
        if (!desktopAudio) {
          try {
            desktopAudio = obs.InputFactory.fromName(daName);
          } catch (e) {
          }
        }
        if (desktopAudio) {
          obs.Global.setOutputSource(1, desktopAudio);
          console.log("Added desktop audio capture");
        }
      } catch (audioError) {
        console.error("Error adding desktop audio:", audioError);
      }
      try {
        const micName = "Microphone";
        let micAudio = obs.InputFactory.create("wasapi_input_capture", micName, { device_id: "default" });
        if (!micAudio) {
          try {
            micAudio = obs.InputFactory.fromName(micName);
          } catch (e) {
          }
        }
        if (micAudio) {
          obs.Global.setOutputSource(3, micAudio);
          console.log("Added microphone capture");
        }
      } catch (micError) {
        console.error("Error adding microphone:", micError);
      }
      obs.Global.setOutputSource(0, scene.source);
      console.log("Set scene as output source");
    } catch (error) {
      console.error("Error setting up scene:", error);
    }
  }
  /**
   * Start the OBS replay buffer
   */
  startReplayBuffer() {
    if (!this.initialized || !obs) return;
    try {
      console.log("Starting Replay Buffer...");
      obs.NodeObs.OBS_service_startReplayBuffer();
    } catch (error) {
      console.error("Error starting replay buffer:", error);
    }
  }
  /**
   * Stop the OBS replay buffer
   */
  stopReplayBuffer() {
    if (!this.replayBufferRunning || !obs) return;
    try {
      console.log("Stopping Replay Buffer...");
      obs.NodeObs.OBS_service_stopReplayBuffer(false);
    } catch (error) {
      console.error("Error stopping replay buffer:", error);
    }
  }
  /**
   * Save the replay buffer and return the path to the saved file
   * Returns a Promise that resolves when the file is saved
   */
  async saveReplayBuffer() {
    console.log("Saving Replay Buffer...");
    if (!this.initialized || !obs) {
      throw new Error("OBS not initialized");
    }
    if (!this.replayBufferRunning) {
      throw new Error("Replay buffer is not running");
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingReplaySave) {
          this.pendingReplaySave = null;
          reject(new Error("Replay save timeout - no response from OBS"));
        }
      }, 1e4);
      this.pendingReplaySave = {
        resolve: (path2) => {
          clearTimeout(timeout);
          resolve(path2);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      };
      try {
        obs.NodeObs.OBS_service_processReplayBufferHotkey();
      } catch (error) {
        this.pendingReplaySave = null;
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  /**
   * Get the last saved replay path (if available)
   */
  getLastReplayPath() {
    return this.lastReplayPath;
  }
  /**
   * Check if replay buffer is currently running
   */
  isReplayBufferRunning() {
    return this.replayBufferRunning;
  }
  getMonitors() {
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      x: d.bounds.x,
      y: d.bounds.y,
      width: d.bounds.width,
      height: d.bounds.height,
      index: i
    }));
  }
  async processReplay(filePath, monitorIndex) {
    console.log(`Processing replay: ${filePath} for monitor ${monitorIndex}`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Replay file not found: ${filePath}`);
    }
    const displays = this.getMonitors();
    const settings = SettingsManager.getInstance().getAllSettings();
    let minX = 0, minY = 0, maxX = 0, maxY = 0;
    displays.forEach((d, i) => {
      if (i === 0 || d.x < minX) minX = d.x;
      if (i === 0 || d.y < minY) minY = d.y;
      if (i === 0 || d.x + d.width > maxX) maxX = d.x + d.width;
      if (i === 0 || d.y + d.height > maxY) maxY = d.y + d.height;
    });
    const nativeWidth = maxX - minX;
    const nativeHeight = maxY - minY;
    const getResolutionFromPreset = (preset, customRes, nativeW, nativeH) => {
      switch (preset) {
        case "1080p": {
          const scale = 1080 / nativeH;
          return { width: Math.round(nativeW * scale), height: 1080 };
        }
        case "720p": {
          const scale = 720 / nativeH;
          return { width: Math.round(nativeW * scale), height: 720 };
        }
        case "480p": {
          const scale = 480 / nativeH;
          return { width: Math.round(nativeW * scale), height: 480 };
        }
        case "custom":
          return customRes || { width: 1920, height: 1080 };
        case "native":
        default:
          return { width: nativeW, height: nativeH };
      }
    };
    const outputRes = getResolutionFromPreset(
      settings.outputResolution,
      settings.customOutputResolution,
      nativeWidth,
      nativeHeight
    );
    const scaleX = outputRes.width / nativeWidth;
    const scaleY = outputRes.height / nativeHeight;
    console.log(`Processing with resolution settings:`);
    console.log(`  Native: ${nativeWidth}x${nativeHeight}`);
    console.log(`  Output: ${outputRes.width}x${outputRes.height}`);
    console.log(`  Scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)}`);
    const processOne = (index) => {
      const monitor = displays[index];
      if (!monitor) return Promise.reject(new Error("Monitor not found"));
      const cropX = Math.round((monitor.x - minX) * scaleX);
      const cropY = Math.round((monitor.y - minY) * scaleY);
      const cropW = Math.round(monitor.width * scaleX);
      const cropH = Math.round(monitor.height * scaleY);
      const output2 = filePath.replace(/(\.[^.]+)$/, `-monitor-${index + 1}$1`);
      console.log(`Cropping monitor ${index + 1}: ${cropW}x${cropH} at (${cropX}, ${cropY})`);
      return new Promise((resolve, reject) => {
        ffmpeg(filePath).videoFilters([
          `crop=${cropW}:${cropH}:${cropX}:${cropY}`
        ]).output(output2).on("end", () => {
          console.log("Processing finished:", output2);
          resolve(output2);
        }).on("error", (err) => {
          console.error("Error processing:", err);
          reject(err);
        }).run();
      });
    };
    if (monitorIndex === "all") {
      console.log("Splitting mega-canvas into separate monitor files...");
      const enabledIndices = settings.enabledMonitors;
      let monitorsToProcess = displays.map((_, i) => i);
      if (enabledIndices) {
        monitorsToProcess = monitorsToProcess.filter((i) => enabledIndices.includes(i));
      }
      const results = await Promise.all(monitorsToProcess.map((i) => processOne(i)));
      try {
        fs.unlinkSync(filePath);
        console.log("Deleted original mega-canvas file:", filePath);
      } catch (deleteErr) {
        console.error("Failed to delete original mega-canvas file:", deleteErr);
      }
      return results;
    } else {
      const result = await processOne(monitorIndex);
      try {
        fs.unlinkSync(filePath);
        console.log("Deleted original mega-canvas file:", filePath);
      } catch (deleteErr) {
        console.error("Failed to delete original mega-canvas file:", deleteErr);
      }
      return result;
    }
  }
  /**
   * Cleanup OBS resources on app exit
   */
  shutdown() {
    if (!this.initialized || !obs) return;
    try {
      console.log("Shutting down OBS...");
      if (this.replayBufferRunning) {
        obs.NodeObs.OBS_service_stopReplayBuffer(true);
      }
      obs.NodeObs.IPC.disconnect();
    } catch (error) {
      console.error("Error shutting down OBS:", error);
    }
  }
};
__publicField(_OBSManager, "instance");
let OBSManager = _OBSManager;
const __dirname$1 = path$3.dirname(fileURLToPath$1(import.meta.url));
process.env.APP_ROOT = path$3.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$3.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$3.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$3.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win = null;
let overlayWindow = null;
let notificationWindow = null;
let tray = null;
let lastReplayPath = null;
let isQuitting = false;
function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    icon: path$3.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    width: 450,
    height: 670,
    resizable: false,
    show: false,
    // Start hidden
    autoHideMenuBar: true,
    // Hide the menu bar
    webPreferences: {
      preload: path$3.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$3.join(RENDERER_DIST, "index.html"));
  }
}
function createTray() {
  const iconPath = path$3.join(process.env.VITE_PUBLIC, "lumin.png");
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (!trayIcon.isEmpty()) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }
  tray = new Tray(trayIcon);
  tray.setToolTip("LuminReplay - Recording");
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "LuminReplay",
      enabled: false
    },
    { type: "separator" },
    {
      label: "Replay Buffer Active",
      enabled: false
    },
    { type: "separator" },
    {
      label: "Save Replay (Alt+F10)",
      click: async () => {
        await performReplaySave();
      }
    },
    { type: "separator" },
    {
      label: "Settings",
      click: () => {
        if (win) {
          win.show();
          win.focus();
        }
      }
    },
    {
      label: "Open Recordings Folder",
      click: () => {
        const settings = SettingsManager.getInstance().getAllSettings();
        shell.openPath(settings.recordingPath);
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
  tray.on("double-click", () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
}
function showOverlay() {
  if (overlayWindow) {
    overlayWindow.focus();
    return;
  }
  overlayWindow = new BrowserWindow({
    width: 450,
    height: 670,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      preload: path$3.join(__dirname$1, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    overlayWindow.loadURL(`${VITE_DEV_SERVER_URL}?overlay=true`);
  } else {
    overlayWindow.loadURL(`file://${path$3.join(RENDERER_DIST, "index.html")}?overlay=true`);
  }
  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });
}
function showNotification(type) {
  if (notificationWindow) {
    notificationWindow.close();
    notificationWindow = null;
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const notificationWidth = 280;
  const notificationHeight = 100;
  const margin = 16;
  notificationWindow = new BrowserWindow({
    width: notificationWidth,
    height: notificationHeight,
    x: screenWidth - notificationWidth - margin,
    y: margin,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: path$3.join(__dirname$1, "preload.mjs")
    }
  });
  notificationWindow.setAlwaysOnTop(true, "screen-saver");
  if (VITE_DEV_SERVER_URL) {
    notificationWindow.loadURL(`${VITE_DEV_SERVER_URL}?notification=${type}`);
  } else {
    notificationWindow.loadURL(`file://${path$3.join(RENDERER_DIST, "index.html")}?notification=${type}`);
  }
  notificationWindow.on("closed", () => {
    notificationWindow = null;
  });
  setTimeout(() => {
    if (notificationWindow) {
      notificationWindow.close();
    }
  }, 3500);
}
async function performReplaySave() {
  try {
    lastReplayPath = await OBSManager.getInstance().saveReplayBuffer();
    const monitors = OBSManager.getInstance().getMonitors();
    const settings = SettingsManager.getInstance().getAllSettings();
    const activeMonitors = monitors.filter((m) => {
      if (!settings.enabledMonitors) return true;
      return settings.enabledMonitors.includes(m.index);
    });
    if (activeMonitors.length === 1) {
      console.log("Single monitor detected/enabled. Replay saved directly (no processing needed).");
      showNotification("recorded");
      return true;
    } else {
      showOverlay();
      return true;
    }
  } catch (err) {
    console.error("Failed to save replay:", err);
    return false;
  }
}
async function performDirectMonitorSave(monitorIndex) {
  try {
    const replayPath = await OBSManager.getInstance().saveReplayBuffer();
    console.log(`Direct save triggered for monitor: ${monitorIndex}`);
    showNotification("recorded");
    OBSManager.getInstance().processReplay(replayPath, monitorIndex).then((result) => {
      console.log("Replay processed to:", result);
      showNotification("saved");
    }).catch((e) => {
      console.error("Error processing replay:", e);
    });
    return true;
  } catch (err) {
    console.error("Failed to save replay for direct monitor save:", err);
    return false;
  }
}
app.on("window-all-closed", () => {
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  OBSManager.getInstance().shutdown();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
}
app.whenReady().then(() => {
  SettingsManager.getInstance();
  createWindow();
  createTray();
  OBSManager.getInstance().initialize();
  const registerGlobalHotkeys = () => {
    globalShortcut.unregisterAll();
    const settings = SettingsManager.getInstance().getAllSettings();
    const mainHotkey = settings.replayHotkey || "Alt+F10";
    const mainRet = globalShortcut.register(mainHotkey, async () => {
      console.log(`${mainHotkey} is pressed - showing overlay`);
      await performReplaySave();
    });
    if (!mainRet) {
      console.log(`Hotkey registration failed for main hotkey: ${mainHotkey}`);
    } else {
      console.log(`Main hotkey ${mainHotkey} registered successfully`);
    }
    if (settings.monitor1Hotkey) {
      const ret = globalShortcut.register(settings.monitor1Hotkey, async () => {
        console.log(`${settings.monitor1Hotkey} is pressed - direct save Monitor 1`);
        await performDirectMonitorSave(0);
      });
      if (!ret) {
        console.log(`Hotkey registration failed for Monitor 1: ${settings.monitor1Hotkey}`);
      } else {
        console.log(`Monitor 1 hotkey ${settings.monitor1Hotkey} registered successfully`);
      }
    }
    if (settings.monitor2Hotkey) {
      const ret = globalShortcut.register(settings.monitor2Hotkey, async () => {
        console.log(`${settings.monitor2Hotkey} is pressed - direct save Monitor 2`);
        await performDirectMonitorSave(1);
      });
      if (!ret) {
        console.log(`Hotkey registration failed for Monitor 2: ${settings.monitor2Hotkey}`);
      } else {
        console.log(`Monitor 2 hotkey ${settings.monitor2Hotkey} registered successfully`);
      }
    }
    if (settings.allMonitorsHotkey) {
      const ret = globalShortcut.register(settings.allMonitorsHotkey, async () => {
        console.log(`${settings.allMonitorsHotkey} is pressed - direct save All Monitors`);
        await performDirectMonitorSave("all");
      });
      if (!ret) {
        console.log(`Hotkey registration failed for All Monitors: ${settings.allMonitorsHotkey}`);
      } else {
        console.log(`All Monitors hotkey ${settings.allMonitorsHotkey} registered successfully`);
      }
    }
  };
  registerGlobalHotkeys();
  ipcMain.handle("update-hotkey", () => {
    registerGlobalHotkeys();
    return true;
  });
  ipcMain.handle("get-monitors", () => {
    return OBSManager.getInstance().getMonitors();
  });
  ipcMain.handle("save-replay", async () => {
    return await performReplaySave();
  });
  ipcMain.handle("select-monitor", async (_event, index) => {
    if (!lastReplayPath) return;
    console.log("Selected monitor:", index);
    if (overlayWindow) overlayWindow.close();
    const replayPath = lastReplayPath;
    OBSManager.getInstance().processReplay(replayPath, index).then((result) => {
      console.log("Replay processed to:", result);
      showNotification("saved");
    }).catch((e) => {
      console.error("Error processing replay:", e);
    });
  });
  console.log("LuminReplay is running in the system tray");
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
