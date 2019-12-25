(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
var hadProto = require("./js_temp/hadbean_pb");
module.exports = {
    DataProto: hadProto
};

},{"./js_temp/hadbean_pb":6}],5:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.com.navinfo.had.model.geometry.LineString', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.geometry.MultiLineString', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.geometry.MultiPolygon', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.geometry.Point', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.geometry.Polygon', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.geometry.Point = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.geometry.Point, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.geometry.Point.displayName = 'proto.com.navinfo.had.model.geometry.Point';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.geometry.Point.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.geometry.Point.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.geometry.Point} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.Point.toObject = function(includeInstance, msg) {
  var f, obj = {
    latitude: +jspb.Message.getFieldWithDefault(msg, 1, 0.0),
    longitude: +jspb.Message.getFieldWithDefault(msg, 2, 0.0),
    elevation: +jspb.Message.getFieldWithDefault(msg, 3, 0.0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.geometry.Point}
 */
proto.com.navinfo.had.model.geometry.Point.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.geometry.Point;
  return proto.com.navinfo.had.model.geometry.Point.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.geometry.Point} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.geometry.Point}
 */
proto.com.navinfo.had.model.geometry.Point.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readDouble());
      msg.setLatitude(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readDouble());
      msg.setLongitude(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readDouble());
      msg.setElevation(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.geometry.Point.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.geometry.Point.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.geometry.Point} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.Point.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLatitude();
  if (f !== 0.0) {
    writer.writeDouble(
      1,
      f
    );
  }
  f = message.getLongitude();
  if (f !== 0.0) {
    writer.writeDouble(
      2,
      f
    );
  }
  f = message.getElevation();
  if (f !== 0.0) {
    writer.writeDouble(
      3,
      f
    );
  }
};


/**
 * optional double latitude = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.geometry.Point.prototype.getLatitude = function() {
  return /** @type {number} */ (+jspb.Message.getFieldWithDefault(this, 1, 0.0));
};


/** @param {number} value */
proto.com.navinfo.had.model.geometry.Point.prototype.setLatitude = function(value) {
  jspb.Message.setProto3FloatField(this, 1, value);
};


/**
 * optional double longitude = 2;
 * @return {number}
 */
proto.com.navinfo.had.model.geometry.Point.prototype.getLongitude = function() {
  return /** @type {number} */ (+jspb.Message.getFieldWithDefault(this, 2, 0.0));
};


/** @param {number} value */
proto.com.navinfo.had.model.geometry.Point.prototype.setLongitude = function(value) {
  jspb.Message.setProto3FloatField(this, 2, value);
};


/**
 * optional double elevation = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.geometry.Point.prototype.getElevation = function() {
  return /** @type {number} */ (+jspb.Message.getFieldWithDefault(this, 3, 0.0));
};


/** @param {number} value */
proto.com.navinfo.had.model.geometry.Point.prototype.setElevation = function(value) {
  jspb.Message.setProto3FloatField(this, 3, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.geometry.LineString = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.geometry.LineString.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.geometry.LineString, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.geometry.LineString.displayName = 'proto.com.navinfo.had.model.geometry.LineString';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.geometry.LineString.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.geometry.LineString.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.geometry.LineString.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.geometry.LineString} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.LineString.toObject = function(includeInstance, msg) {
  var f, obj = {
    linestringList: jspb.Message.toObjectList(msg.getLinestringList(),
    proto.com.navinfo.had.model.geometry.Point.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.geometry.LineString.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.geometry.LineString;
  return proto.com.navinfo.had.model.geometry.LineString.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.geometry.LineString} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.geometry.LineString.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.geometry.Point;
      reader.readMessage(value,proto.com.navinfo.had.model.geometry.Point.deserializeBinaryFromReader);
      msg.addLinestring(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.geometry.LineString.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.geometry.LineString.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.geometry.LineString} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.LineString.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLinestringList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.geometry.Point.serializeBinaryToWriter
    );
  }
};


/**
 * repeated Point lineString = 1;
 * @return {!Array<!proto.com.navinfo.had.model.geometry.Point>}
 */
proto.com.navinfo.had.model.geometry.LineString.prototype.getLinestringList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.geometry.Point>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.geometry.Point, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.geometry.Point>} value */
proto.com.navinfo.had.model.geometry.LineString.prototype.setLinestringList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.geometry.Point=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.geometry.Point}
 */
proto.com.navinfo.had.model.geometry.LineString.prototype.addLinestring = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.geometry.Point, opt_index);
};


proto.com.navinfo.had.model.geometry.LineString.prototype.clearLinestringList = function() {
  this.setLinestringList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.geometry.Polygon = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.geometry.Polygon.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.geometry.Polygon, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.geometry.Polygon.displayName = 'proto.com.navinfo.had.model.geometry.Polygon';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.geometry.Polygon.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.geometry.Polygon.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.geometry.Polygon.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.geometry.Polygon} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.Polygon.toObject = function(includeInstance, msg) {
  var f, obj = {
    linestringList: jspb.Message.toObjectList(msg.getLinestringList(),
    proto.com.navinfo.had.model.geometry.LineString.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.geometry.Polygon.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.geometry.Polygon;
  return proto.com.navinfo.had.model.geometry.Polygon.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.geometry.Polygon} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.geometry.Polygon.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.geometry.LineString;
      reader.readMessage(value,proto.com.navinfo.had.model.geometry.LineString.deserializeBinaryFromReader);
      msg.addLinestring(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.geometry.Polygon.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.geometry.Polygon.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.geometry.Polygon} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.Polygon.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLinestringList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.geometry.LineString.serializeBinaryToWriter
    );
  }
};


/**
 * repeated LineString lineString = 1;
 * @return {!Array<!proto.com.navinfo.had.model.geometry.LineString>}
 */
proto.com.navinfo.had.model.geometry.Polygon.prototype.getLinestringList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.geometry.LineString>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.geometry.LineString, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.geometry.LineString>} value */
proto.com.navinfo.had.model.geometry.Polygon.prototype.setLinestringList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.geometry.LineString=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.geometry.Polygon.prototype.addLinestring = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.geometry.LineString, opt_index);
};


proto.com.navinfo.had.model.geometry.Polygon.prototype.clearLinestringList = function() {
  this.setLinestringList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.geometry.MultiLineString = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.geometry.MultiLineString.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.geometry.MultiLineString, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.geometry.MultiLineString.displayName = 'proto.com.navinfo.had.model.geometry.MultiLineString';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.geometry.MultiLineString.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.geometry.MultiLineString.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.geometry.MultiLineString} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.MultiLineString.toObject = function(includeInstance, msg) {
  var f, obj = {
    multilinestringList: jspb.Message.toObjectList(msg.getMultilinestringList(),
    proto.com.navinfo.had.model.geometry.LineString.toObject, includeInstance),
    multinum: jspb.Message.getFieldWithDefault(msg, 2, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.geometry.MultiLineString}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.geometry.MultiLineString;
  return proto.com.navinfo.had.model.geometry.MultiLineString.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.geometry.MultiLineString} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.geometry.MultiLineString}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.geometry.LineString;
      reader.readMessage(value,proto.com.navinfo.had.model.geometry.LineString.deserializeBinaryFromReader);
      msg.addMultilinestring(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMultinum(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.geometry.MultiLineString.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.geometry.MultiLineString} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.MultiLineString.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getMultilinestringList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.geometry.LineString.serializeBinaryToWriter
    );
  }
  f = message.getMultinum();
  if (f !== 0) {
    writer.writeSint32(
      2,
      f
    );
  }
};


/**
 * repeated LineString multiLineString = 1;
 * @return {!Array<!proto.com.navinfo.had.model.geometry.LineString>}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.getMultilinestringList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.geometry.LineString>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.geometry.LineString, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.geometry.LineString>} value */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.setMultilinestringList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.geometry.LineString=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.addMultilinestring = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.geometry.LineString, opt_index);
};


proto.com.navinfo.had.model.geometry.MultiLineString.prototype.clearMultilinestringList = function() {
  this.setMultilinestringList([]);
};


/**
 * optional sint32 multiNum = 2;
 * @return {number}
 */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.getMultinum = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.geometry.MultiLineString.prototype.setMultinum = function(value) {
  jspb.Message.setProto3IntField(this, 2, value);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.geometry.MultiPolygon = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.geometry.MultiPolygon.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.geometry.MultiPolygon, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.geometry.MultiPolygon.displayName = 'proto.com.navinfo.had.model.geometry.MultiPolygon';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.geometry.MultiPolygon.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.geometry.MultiPolygon} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.toObject = function(includeInstance, msg) {
  var f, obj = {
    multipolygonList: jspb.Message.toObjectList(msg.getMultipolygonList(),
    proto.com.navinfo.had.model.geometry.Polygon.toObject, includeInstance),
    multinum: jspb.Message.getFieldWithDefault(msg, 2, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.geometry.MultiPolygon}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.geometry.MultiPolygon;
  return proto.com.navinfo.had.model.geometry.MultiPolygon.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.geometry.MultiPolygon} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.geometry.MultiPolygon}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.geometry.Polygon;
      reader.readMessage(value,proto.com.navinfo.had.model.geometry.Polygon.deserializeBinaryFromReader);
      msg.addMultipolygon(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMultinum(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.geometry.MultiPolygon.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.geometry.MultiPolygon} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getMultipolygonList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.geometry.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getMultinum();
  if (f !== 0) {
    writer.writeSint32(
      2,
      f
    );
  }
};


/**
 * repeated Polygon multiPolygon = 1;
 * @return {!Array<!proto.com.navinfo.had.model.geometry.Polygon>}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.getMultipolygonList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.geometry.Polygon>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.geometry.Polygon, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.geometry.Polygon>} value */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.setMultipolygonList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.geometry.Polygon=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.addMultipolygon = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.geometry.Polygon, opt_index);
};


proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.clearMultipolygonList = function() {
  this.setMultipolygonList([]);
};


/**
 * optional sint32 multiNum = 2;
 * @return {number}
 */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.getMultinum = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.geometry.MultiPolygon.prototype.setMultinum = function(value) {
  jspb.Message.setProto3IntField(this, 2, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model.geometry);

},{"google-protobuf":38}],6:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var hadlink_pb = require('./hadlink_pb.js');
var hadlanelink_pb = require('./hadlanelink_pb.js');
var hadlanemarklink_pb = require('./hadlanemarklink_pb.js');
var hadobjectpole_pb = require('./hadobjectpole_pb.js');
var hadobjectlinepole_pb = require('./hadobjectlinepole_pb.js');
var hadobjecttrafficsign_pb = require('./hadobjecttrafficsign_pb.js');
var hadobjectoverheadcrossing_pb = require('./hadobjectoverheadcrossing_pb.js');
var hadobjectcurb_pb = require('./hadobjectcurb_pb.js');
var hadobjecttrafficbarrier_pb = require('./hadobjecttrafficbarrier_pb.js');
var hadobjectmessagesign_pb = require('./hadobjectmessagesign_pb.js');
var hadobjectoverheadstructure_pb = require('./hadobjectoverheadstructure_pb.js');
var hadobjecttunnel_pb = require('./hadobjecttunnel_pb.js');
var hadobjectdelineator_pb = require('./hadobjectdelineator_pb.js');
var hadobjecttollbooth_pb = require('./hadobjecttollbooth_pb.js');
var hadobjectcallbox_pb = require('./hadobjectcallbox_pb.js');
var hadobjectditch_pb = require('./hadobjectditch_pb.js');
var hadobjectwall_pb = require('./hadobjectwall_pb.js');
var hadobjectwallperpendicular_pb = require('./hadobjectwallperpendicular_pb.js');
var hadobjectarrow_pb = require('./hadobjectarrow_pb.js');
var hadobjecttext_pb = require('./hadobjecttext_pb.js');
var hadobjectsymbol_pb = require('./hadobjectsymbol_pb.js');
var hadobjectwarningarea_pb = require('./hadobjectwarningarea_pb.js');
var hadobjectfillarea_pb = require('./hadobjectfillarea_pb.js');
var hadobjecttrafficlights_pb = require('./hadobjecttrafficlights_pb.js');
var hadobjectbuilding_pb = require('./hadobjectbuilding_pb.js');
var hadobjectstoplocation_pb = require('./hadobjectstoplocation_pb.js');
var hadobjectcrosswalk_pb = require('./hadobjectcrosswalk_pb.js');
var hadobjectbusstop_pb = require('./hadobjectbusstop_pb.js');
var hadobjectspeedbump_pb = require('./hadobjectspeedbump_pb.js');
var hadobjectcrossbike_pb = require('./hadobjectcrossbike_pb.js');
var hadobjectpillar_pb = require('./hadobjectpillar_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadBean', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadLanes', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadLinks', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjects', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadBean = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadBean, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadBean.displayName = 'proto.com.navinfo.had.model.HadBean';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadBean.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadBean.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadBean} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadBean.toObject = function(includeInstance, msg) {
  var f, obj = {
    mesh: jspb.Message.getFieldWithDefault(msg, 1, ""),
    hadlinks: (f = msg.getHadlinks()) && proto.com.navinfo.had.model.HadLinks.toObject(includeInstance, f),
    hadlanes: (f = msg.getHadlanes()) && proto.com.navinfo.had.model.HadLanes.toObject(includeInstance, f),
    hadobjects: (f = msg.getHadobjects()) && proto.com.navinfo.had.model.HadObjects.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadBean}
 */
proto.com.navinfo.had.model.HadBean.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadBean;
  return proto.com.navinfo.had.model.HadBean.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadBean} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadBean}
 */
proto.com.navinfo.had.model.HadBean.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setMesh(value);
      break;
    case 2:
      var value = new proto.com.navinfo.had.model.HadLinks;
      reader.readMessage(value,proto.com.navinfo.had.model.HadLinks.deserializeBinaryFromReader);
      msg.setHadlinks(value);
      break;
    case 3:
      var value = new proto.com.navinfo.had.model.HadLanes;
      reader.readMessage(value,proto.com.navinfo.had.model.HadLanes.deserializeBinaryFromReader);
      msg.setHadlanes(value);
      break;
    case 4:
      var value = new proto.com.navinfo.had.model.HadObjects;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjects.deserializeBinaryFromReader);
      msg.setHadobjects(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadBean.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadBean.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadBean} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadBean.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getMesh();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getHadlinks();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      proto.com.navinfo.had.model.HadLinks.serializeBinaryToWriter
    );
  }
  f = message.getHadlanes();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      proto.com.navinfo.had.model.HadLanes.serializeBinaryToWriter
    );
  }
  f = message.getHadobjects();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      proto.com.navinfo.had.model.HadObjects.serializeBinaryToWriter
    );
  }
};


/**
 * optional string mesh = 1;
 * @return {string}
 */
proto.com.navinfo.had.model.HadBean.prototype.getMesh = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/** @param {string} value */
proto.com.navinfo.had.model.HadBean.prototype.setMesh = function(value) {
  jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional HadLinks hadLinks = 2;
 * @return {?proto.com.navinfo.had.model.HadLinks}
 */
proto.com.navinfo.had.model.HadBean.prototype.getHadlinks = function() {
  return /** @type{?proto.com.navinfo.had.model.HadLinks} */ (
    jspb.Message.getWrapperField(this, proto.com.navinfo.had.model.HadLinks, 2));
};


/** @param {?proto.com.navinfo.had.model.HadLinks|undefined} value */
proto.com.navinfo.had.model.HadBean.prototype.setHadlinks = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadBean.prototype.clearHadlinks = function() {
  this.setHadlinks(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadBean.prototype.hasHadlinks = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional HadLanes hadLanes = 3;
 * @return {?proto.com.navinfo.had.model.HadLanes}
 */
proto.com.navinfo.had.model.HadBean.prototype.getHadlanes = function() {
  return /** @type{?proto.com.navinfo.had.model.HadLanes} */ (
    jspb.Message.getWrapperField(this, proto.com.navinfo.had.model.HadLanes, 3));
};


/** @param {?proto.com.navinfo.had.model.HadLanes|undefined} value */
proto.com.navinfo.had.model.HadBean.prototype.setHadlanes = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.com.navinfo.had.model.HadBean.prototype.clearHadlanes = function() {
  this.setHadlanes(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadBean.prototype.hasHadlanes = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional HadObjects hadObjects = 4;
 * @return {?proto.com.navinfo.had.model.HadObjects}
 */
proto.com.navinfo.had.model.HadBean.prototype.getHadobjects = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjects} */ (
    jspb.Message.getWrapperField(this, proto.com.navinfo.had.model.HadObjects, 4));
};


/** @param {?proto.com.navinfo.had.model.HadObjects|undefined} value */
proto.com.navinfo.had.model.HadBean.prototype.setHadobjects = function(value) {
  jspb.Message.setWrapperField(this, 4, value);
};


proto.com.navinfo.had.model.HadBean.prototype.clearHadobjects = function() {
  this.setHadobjects(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadBean.prototype.hasHadobjects = function() {
  return jspb.Message.getField(this, 4) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLinks = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLinks, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLinks.displayName = 'proto.com.navinfo.had.model.HadLinks';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLinks.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLinks.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLinks} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLinks.toObject = function(includeInstance, msg) {
  var f, obj = {
    hadlinklist: (f = msg.getHadlinklist()) && hadlink_pb.HadLinkList.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLinks}
 */
proto.com.navinfo.had.model.HadLinks.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLinks;
  return proto.com.navinfo.had.model.HadLinks.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLinks} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLinks}
 */
proto.com.navinfo.had.model.HadLinks.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new hadlink_pb.HadLinkList;
      reader.readMessage(value,hadlink_pb.HadLinkList.deserializeBinaryFromReader);
      msg.setHadlinklist(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLinks.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLinks.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLinks} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLinks.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getHadlinklist();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      hadlink_pb.HadLinkList.serializeBinaryToWriter
    );
  }
};


/**
 * optional HadLinkList hadLinkList = 1;
 * @return {?proto.com.navinfo.had.model.HadLinkList}
 */
proto.com.navinfo.had.model.HadLinks.prototype.getHadlinklist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadLinkList} */ (
    jspb.Message.getWrapperField(this, hadlink_pb.HadLinkList, 1));
};


/** @param {?proto.com.navinfo.had.model.HadLinkList|undefined} value */
proto.com.navinfo.had.model.HadLinks.prototype.setHadlinklist = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.com.navinfo.had.model.HadLinks.prototype.clearHadlinklist = function() {
  this.setHadlinklist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadLinks.prototype.hasHadlinklist = function() {
  return jspb.Message.getField(this, 1) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLanes = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLanes, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLanes.displayName = 'proto.com.navinfo.had.model.HadLanes';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLanes.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLanes.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLanes} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLanes.toObject = function(includeInstance, msg) {
  var f, obj = {
    hadlanelinklist: (f = msg.getHadlanelinklist()) && hadlanelink_pb.HadLaneLinkList.toObject(includeInstance, f),
    hadlanemarklinklist: (f = msg.getHadlanemarklinklist()) && hadlanemarklink_pb.HadLaneMarkLinkList.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLanes}
 */
proto.com.navinfo.had.model.HadLanes.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLanes;
  return proto.com.navinfo.had.model.HadLanes.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLanes} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLanes}
 */
proto.com.navinfo.had.model.HadLanes.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new hadlanelink_pb.HadLaneLinkList;
      reader.readMessage(value,hadlanelink_pb.HadLaneLinkList.deserializeBinaryFromReader);
      msg.setHadlanelinklist(value);
      break;
    case 2:
      var value = new hadlanemarklink_pb.HadLaneMarkLinkList;
      reader.readMessage(value,hadlanemarklink_pb.HadLaneMarkLinkList.deserializeBinaryFromReader);
      msg.setHadlanemarklinklist(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLanes.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLanes.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLanes} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLanes.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getHadlanelinklist();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      hadlanelink_pb.HadLaneLinkList.serializeBinaryToWriter
    );
  }
  f = message.getHadlanemarklinklist();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      hadlanemarklink_pb.HadLaneMarkLinkList.serializeBinaryToWriter
    );
  }
};


/**
 * optional HadLaneLinkList hadLaneLinkList = 1;
 * @return {?proto.com.navinfo.had.model.HadLaneLinkList}
 */
proto.com.navinfo.had.model.HadLanes.prototype.getHadlanelinklist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadLaneLinkList} */ (
    jspb.Message.getWrapperField(this, hadlanelink_pb.HadLaneLinkList, 1));
};


/** @param {?proto.com.navinfo.had.model.HadLaneLinkList|undefined} value */
proto.com.navinfo.had.model.HadLanes.prototype.setHadlanelinklist = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.com.navinfo.had.model.HadLanes.prototype.clearHadlanelinklist = function() {
  this.setHadlanelinklist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadLanes.prototype.hasHadlanelinklist = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional HadLaneMarkLinkList hadLaneMarkLinkList = 2;
 * @return {?proto.com.navinfo.had.model.HadLaneMarkLinkList}
 */
proto.com.navinfo.had.model.HadLanes.prototype.getHadlanemarklinklist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadLaneMarkLinkList} */ (
    jspb.Message.getWrapperField(this, hadlanemarklink_pb.HadLaneMarkLinkList, 2));
};


/** @param {?proto.com.navinfo.had.model.HadLaneMarkLinkList|undefined} value */
proto.com.navinfo.had.model.HadLanes.prototype.setHadlanemarklinklist = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadLanes.prototype.clearHadlanemarklinklist = function() {
  this.setHadlanemarklinklist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadLanes.prototype.hasHadlanemarklinklist = function() {
  return jspb.Message.getField(this, 2) != null;
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjects = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjects, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjects.displayName = 'proto.com.navinfo.had.model.HadObjects';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjects.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjects.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjects} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjects.toObject = function(includeInstance, msg) {
  var f, obj = {
    hadobjectpolelist: (f = msg.getHadobjectpolelist()) && hadobjectpole_pb.HadObjectPoleList.toObject(includeInstance, f),
    hadobjecttrafficsignlist: (f = msg.getHadobjecttrafficsignlist()) && hadobjecttrafficsign_pb.HadObjectTrafficSignList.toObject(includeInstance, f),
    hadobjectoverheadcrossinglist: (f = msg.getHadobjectoverheadcrossinglist()) && hadobjectoverheadcrossing_pb.HadObjectOverheadCrossingList.toObject(includeInstance, f),
    hadobjectcurblist: (f = msg.getHadobjectcurblist()) && hadobjectcurb_pb.HadObjectCurbList.toObject(includeInstance, f),
    hadobjectlinepolelist: (f = msg.getHadobjectlinepolelist()) && hadobjectlinepole_pb.HadObjectLinePoleList.toObject(includeInstance, f),
    hadobjecttrafficbarrierlist: (f = msg.getHadobjecttrafficbarrierlist()) && hadobjecttrafficbarrier_pb.HadObjectTrafficBarrierList.toObject(includeInstance, f),
    hadobjectmessagesignlist: (f = msg.getHadobjectmessagesignlist()) && hadobjectmessagesign_pb.HadObjectMessageSignList.toObject(includeInstance, f),
    hadobjectoverheadstructurelist: (f = msg.getHadobjectoverheadstructurelist()) && hadobjectoverheadstructure_pb.HadObjectOverheadStructureList.toObject(includeInstance, f),
    hadobjecttunnellist: (f = msg.getHadobjecttunnellist()) && hadobjecttunnel_pb.HadObjectTunnelList.toObject(includeInstance, f),
    hadobjectdelineatorlist: (f = msg.getHadobjectdelineatorlist()) && hadobjectdelineator_pb.HadObjectDelineatorList.toObject(includeInstance, f),
    hadobjecttollboothlist: (f = msg.getHadobjecttollboothlist()) && hadobjecttollbooth_pb.HadObjectTollBoothList.toObject(includeInstance, f),
    hadobjectcallboxlist: (f = msg.getHadobjectcallboxlist()) && hadobjectcallbox_pb.HadObjectCallBoxList.toObject(includeInstance, f),
    hadobjectditchlist: (f = msg.getHadobjectditchlist()) && hadobjectditch_pb.HadObjectDitchList.toObject(includeInstance, f),
    hadobjectwalllist: (f = msg.getHadobjectwalllist()) && hadobjectwall_pb.HadObjectWallList.toObject(includeInstance, f),
    hadobjectwallperpendicularlist: (f = msg.getHadobjectwallperpendicularlist()) && hadobjectwallperpendicular_pb.HadObjectWallPerpendicularList.toObject(includeInstance, f),
    hadobjectarrowlist: (f = msg.getHadobjectarrowlist()) && hadobjectarrow_pb.HadObjectArrowList.toObject(includeInstance, f),
    hadobjecttextlist: (f = msg.getHadobjecttextlist()) && hadobjecttext_pb.HadObjectTextList.toObject(includeInstance, f),
    hadobjectsymbollist: (f = msg.getHadobjectsymbollist()) && hadobjectsymbol_pb.HadObjectSymbolList.toObject(includeInstance, f),
    hadobjectwarningarealist: (f = msg.getHadobjectwarningarealist()) && hadobjectwarningarea_pb.HadObjectWarningAreaList.toObject(includeInstance, f),
    hadobjectfillarealist: (f = msg.getHadobjectfillarealist()) && hadobjectfillarea_pb.HadObjectFillAreaList.toObject(includeInstance, f),
    hadobjecttrafficlightslist: (f = msg.getHadobjecttrafficlightslist()) && hadobjecttrafficlights_pb.HadObjectTrafficLightsList.toObject(includeInstance, f),
    hadobjectbuildinglist: (f = msg.getHadobjectbuildinglist()) && hadobjectbuilding_pb.HadObjectBuildingList.toObject(includeInstance, f),
    hadobjectstoplocationlist: (f = msg.getHadobjectstoplocationlist()) && hadobjectstoplocation_pb.HadObjectStopLocationList.toObject(includeInstance, f),
    hadobjectcrosswalklist: (f = msg.getHadobjectcrosswalklist()) && hadobjectcrosswalk_pb.HadObjectCrossWalkList.toObject(includeInstance, f),
    hadobjectbusstoplist: (f = msg.getHadobjectbusstoplist()) && hadobjectbusstop_pb.HadObjectBusStopList.toObject(includeInstance, f),
    hadobjectspeedbumplist: (f = msg.getHadobjectspeedbumplist()) && hadobjectspeedbump_pb.HadObjectSpeedBumpList.toObject(includeInstance, f),
    hadobjectcrossbikelist: (f = msg.getHadobjectcrossbikelist()) && hadobjectcrossbike_pb.HadObjectCrossBikeList.toObject(includeInstance, f),
    hadobjectpillarlist: (f = msg.getHadobjectpillarlist()) && hadobjectpillar_pb.HadObjectPillarList.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjects}
 */
proto.com.navinfo.had.model.HadObjects.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjects;
  return proto.com.navinfo.had.model.HadObjects.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjects} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjects}
 */
proto.com.navinfo.had.model.HadObjects.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new hadobjectpole_pb.HadObjectPoleList;
      reader.readMessage(value,hadobjectpole_pb.HadObjectPoleList.deserializeBinaryFromReader);
      msg.setHadobjectpolelist(value);
      break;
    case 2:
      var value = new hadobjecttrafficsign_pb.HadObjectTrafficSignList;
      reader.readMessage(value,hadobjecttrafficsign_pb.HadObjectTrafficSignList.deserializeBinaryFromReader);
      msg.setHadobjecttrafficsignlist(value);
      break;
    case 3:
      var value = new hadobjectoverheadcrossing_pb.HadObjectOverheadCrossingList;
      reader.readMessage(value,hadobjectoverheadcrossing_pb.HadObjectOverheadCrossingList.deserializeBinaryFromReader);
      msg.setHadobjectoverheadcrossinglist(value);
      break;
    case 4:
      var value = new hadobjectcurb_pb.HadObjectCurbList;
      reader.readMessage(value,hadobjectcurb_pb.HadObjectCurbList.deserializeBinaryFromReader);
      msg.setHadobjectcurblist(value);
      break;
    case 5:
      var value = new hadobjectlinepole_pb.HadObjectLinePoleList;
      reader.readMessage(value,hadobjectlinepole_pb.HadObjectLinePoleList.deserializeBinaryFromReader);
      msg.setHadobjectlinepolelist(value);
      break;
    case 6:
      var value = new hadobjecttrafficbarrier_pb.HadObjectTrafficBarrierList;
      reader.readMessage(value,hadobjecttrafficbarrier_pb.HadObjectTrafficBarrierList.deserializeBinaryFromReader);
      msg.setHadobjecttrafficbarrierlist(value);
      break;
    case 7:
      var value = new hadobjectmessagesign_pb.HadObjectMessageSignList;
      reader.readMessage(value,hadobjectmessagesign_pb.HadObjectMessageSignList.deserializeBinaryFromReader);
      msg.setHadobjectmessagesignlist(value);
      break;
    case 8:
      var value = new hadobjectoverheadstructure_pb.HadObjectOverheadStructureList;
      reader.readMessage(value,hadobjectoverheadstructure_pb.HadObjectOverheadStructureList.deserializeBinaryFromReader);
      msg.setHadobjectoverheadstructurelist(value);
      break;
    case 9:
      var value = new hadobjecttunnel_pb.HadObjectTunnelList;
      reader.readMessage(value,hadobjecttunnel_pb.HadObjectTunnelList.deserializeBinaryFromReader);
      msg.setHadobjecttunnellist(value);
      break;
    case 10:
      var value = new hadobjectdelineator_pb.HadObjectDelineatorList;
      reader.readMessage(value,hadobjectdelineator_pb.HadObjectDelineatorList.deserializeBinaryFromReader);
      msg.setHadobjectdelineatorlist(value);
      break;
    case 11:
      var value = new hadobjecttollbooth_pb.HadObjectTollBoothList;
      reader.readMessage(value,hadobjecttollbooth_pb.HadObjectTollBoothList.deserializeBinaryFromReader);
      msg.setHadobjecttollboothlist(value);
      break;
    case 12:
      var value = new hadobjectcallbox_pb.HadObjectCallBoxList;
      reader.readMessage(value,hadobjectcallbox_pb.HadObjectCallBoxList.deserializeBinaryFromReader);
      msg.setHadobjectcallboxlist(value);
      break;
    case 13:
      var value = new hadobjectditch_pb.HadObjectDitchList;
      reader.readMessage(value,hadobjectditch_pb.HadObjectDitchList.deserializeBinaryFromReader);
      msg.setHadobjectditchlist(value);
      break;
    case 14:
      var value = new hadobjectwall_pb.HadObjectWallList;
      reader.readMessage(value,hadobjectwall_pb.HadObjectWallList.deserializeBinaryFromReader);
      msg.setHadobjectwalllist(value);
      break;
    case 15:
      var value = new hadobjectwallperpendicular_pb.HadObjectWallPerpendicularList;
      reader.readMessage(value,hadobjectwallperpendicular_pb.HadObjectWallPerpendicularList.deserializeBinaryFromReader);
      msg.setHadobjectwallperpendicularlist(value);
      break;
    case 16:
      var value = new hadobjectarrow_pb.HadObjectArrowList;
      reader.readMessage(value,hadobjectarrow_pb.HadObjectArrowList.deserializeBinaryFromReader);
      msg.setHadobjectarrowlist(value);
      break;
    case 17:
      var value = new hadobjecttext_pb.HadObjectTextList;
      reader.readMessage(value,hadobjecttext_pb.HadObjectTextList.deserializeBinaryFromReader);
      msg.setHadobjecttextlist(value);
      break;
    case 18:
      var value = new hadobjectsymbol_pb.HadObjectSymbolList;
      reader.readMessage(value,hadobjectsymbol_pb.HadObjectSymbolList.deserializeBinaryFromReader);
      msg.setHadobjectsymbollist(value);
      break;
    case 19:
      var value = new hadobjectwarningarea_pb.HadObjectWarningAreaList;
      reader.readMessage(value,hadobjectwarningarea_pb.HadObjectWarningAreaList.deserializeBinaryFromReader);
      msg.setHadobjectwarningarealist(value);
      break;
    case 20:
      var value = new hadobjectfillarea_pb.HadObjectFillAreaList;
      reader.readMessage(value,hadobjectfillarea_pb.HadObjectFillAreaList.deserializeBinaryFromReader);
      msg.setHadobjectfillarealist(value);
      break;
    case 21:
      var value = new hadobjecttrafficlights_pb.HadObjectTrafficLightsList;
      reader.readMessage(value,hadobjecttrafficlights_pb.HadObjectTrafficLightsList.deserializeBinaryFromReader);
      msg.setHadobjecttrafficlightslist(value);
      break;
    case 22:
      var value = new hadobjectbuilding_pb.HadObjectBuildingList;
      reader.readMessage(value,hadobjectbuilding_pb.HadObjectBuildingList.deserializeBinaryFromReader);
      msg.setHadobjectbuildinglist(value);
      break;
    case 23:
      var value = new hadobjectstoplocation_pb.HadObjectStopLocationList;
      reader.readMessage(value,hadobjectstoplocation_pb.HadObjectStopLocationList.deserializeBinaryFromReader);
      msg.setHadobjectstoplocationlist(value);
      break;
    case 24:
      var value = new hadobjectcrosswalk_pb.HadObjectCrossWalkList;
      reader.readMessage(value,hadobjectcrosswalk_pb.HadObjectCrossWalkList.deserializeBinaryFromReader);
      msg.setHadobjectcrosswalklist(value);
      break;
    case 25:
      var value = new hadobjectbusstop_pb.HadObjectBusStopList;
      reader.readMessage(value,hadobjectbusstop_pb.HadObjectBusStopList.deserializeBinaryFromReader);
      msg.setHadobjectbusstoplist(value);
      break;
    case 26:
      var value = new hadobjectspeedbump_pb.HadObjectSpeedBumpList;
      reader.readMessage(value,hadobjectspeedbump_pb.HadObjectSpeedBumpList.deserializeBinaryFromReader);
      msg.setHadobjectspeedbumplist(value);
      break;
    case 27:
      var value = new hadobjectcrossbike_pb.HadObjectCrossBikeList;
      reader.readMessage(value,hadobjectcrossbike_pb.HadObjectCrossBikeList.deserializeBinaryFromReader);
      msg.setHadobjectcrossbikelist(value);
      break;
    case 28:
      var value = new hadobjectpillar_pb.HadObjectPillarList;
      reader.readMessage(value,hadobjectpillar_pb.HadObjectPillarList.deserializeBinaryFromReader);
      msg.setHadobjectpillarlist(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjects.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjects.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjects} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjects.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getHadobjectpolelist();
  if (f != null) {
    writer.writeMessage(
      1,
      f,
      hadobjectpole_pb.HadObjectPoleList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjecttrafficsignlist();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      hadobjecttrafficsign_pb.HadObjectTrafficSignList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectoverheadcrossinglist();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      hadobjectoverheadcrossing_pb.HadObjectOverheadCrossingList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectcurblist();
  if (f != null) {
    writer.writeMessage(
      4,
      f,
      hadobjectcurb_pb.HadObjectCurbList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectlinepolelist();
  if (f != null) {
    writer.writeMessage(
      5,
      f,
      hadobjectlinepole_pb.HadObjectLinePoleList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjecttrafficbarrierlist();
  if (f != null) {
    writer.writeMessage(
      6,
      f,
      hadobjecttrafficbarrier_pb.HadObjectTrafficBarrierList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectmessagesignlist();
  if (f != null) {
    writer.writeMessage(
      7,
      f,
      hadobjectmessagesign_pb.HadObjectMessageSignList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectoverheadstructurelist();
  if (f != null) {
    writer.writeMessage(
      8,
      f,
      hadobjectoverheadstructure_pb.HadObjectOverheadStructureList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjecttunnellist();
  if (f != null) {
    writer.writeMessage(
      9,
      f,
      hadobjecttunnel_pb.HadObjectTunnelList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectdelineatorlist();
  if (f != null) {
    writer.writeMessage(
      10,
      f,
      hadobjectdelineator_pb.HadObjectDelineatorList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjecttollboothlist();
  if (f != null) {
    writer.writeMessage(
      11,
      f,
      hadobjecttollbooth_pb.HadObjectTollBoothList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectcallboxlist();
  if (f != null) {
    writer.writeMessage(
      12,
      f,
      hadobjectcallbox_pb.HadObjectCallBoxList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectditchlist();
  if (f != null) {
    writer.writeMessage(
      13,
      f,
      hadobjectditch_pb.HadObjectDitchList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectwalllist();
  if (f != null) {
    writer.writeMessage(
      14,
      f,
      hadobjectwall_pb.HadObjectWallList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectwallperpendicularlist();
  if (f != null) {
    writer.writeMessage(
      15,
      f,
      hadobjectwallperpendicular_pb.HadObjectWallPerpendicularList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectarrowlist();
  if (f != null) {
    writer.writeMessage(
      16,
      f,
      hadobjectarrow_pb.HadObjectArrowList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjecttextlist();
  if (f != null) {
    writer.writeMessage(
      17,
      f,
      hadobjecttext_pb.HadObjectTextList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectsymbollist();
  if (f != null) {
    writer.writeMessage(
      18,
      f,
      hadobjectsymbol_pb.HadObjectSymbolList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectwarningarealist();
  if (f != null) {
    writer.writeMessage(
      19,
      f,
      hadobjectwarningarea_pb.HadObjectWarningAreaList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectfillarealist();
  if (f != null) {
    writer.writeMessage(
      20,
      f,
      hadobjectfillarea_pb.HadObjectFillAreaList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjecttrafficlightslist();
  if (f != null) {
    writer.writeMessage(
      21,
      f,
      hadobjecttrafficlights_pb.HadObjectTrafficLightsList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectbuildinglist();
  if (f != null) {
    writer.writeMessage(
      22,
      f,
      hadobjectbuilding_pb.HadObjectBuildingList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectstoplocationlist();
  if (f != null) {
    writer.writeMessage(
      23,
      f,
      hadobjectstoplocation_pb.HadObjectStopLocationList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectcrosswalklist();
  if (f != null) {
    writer.writeMessage(
      24,
      f,
      hadobjectcrosswalk_pb.HadObjectCrossWalkList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectbusstoplist();
  if (f != null) {
    writer.writeMessage(
      25,
      f,
      hadobjectbusstop_pb.HadObjectBusStopList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectspeedbumplist();
  if (f != null) {
    writer.writeMessage(
      26,
      f,
      hadobjectspeedbump_pb.HadObjectSpeedBumpList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectcrossbikelist();
  if (f != null) {
    writer.writeMessage(
      27,
      f,
      hadobjectcrossbike_pb.HadObjectCrossBikeList.serializeBinaryToWriter
    );
  }
  f = message.getHadobjectpillarlist();
  if (f != null) {
    writer.writeMessage(
      28,
      f,
      hadobjectpillar_pb.HadObjectPillarList.serializeBinaryToWriter
    );
  }
};


/**
 * optional HadObjectPoleList hadObjectPoleList = 1;
 * @return {?proto.com.navinfo.had.model.HadObjectPoleList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectpolelist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectPoleList} */ (
    jspb.Message.getWrapperField(this, hadobjectpole_pb.HadObjectPoleList, 1));
};


/** @param {?proto.com.navinfo.had.model.HadObjectPoleList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectpolelist = function(value) {
  jspb.Message.setWrapperField(this, 1, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectpolelist = function() {
  this.setHadobjectpolelist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectpolelist = function() {
  return jspb.Message.getField(this, 1) != null;
};


/**
 * optional HadObjectTrafficSignList hadObjectTrafficSignList = 2;
 * @return {?proto.com.navinfo.had.model.HadObjectTrafficSignList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjecttrafficsignlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectTrafficSignList} */ (
    jspb.Message.getWrapperField(this, hadobjecttrafficsign_pb.HadObjectTrafficSignList, 2));
};


/** @param {?proto.com.navinfo.had.model.HadObjectTrafficSignList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjecttrafficsignlist = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjecttrafficsignlist = function() {
  this.setHadobjecttrafficsignlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjecttrafficsignlist = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional HadObjectOverheadCrossingList hadObjectOverheadCrossingList = 3;
 * @return {?proto.com.navinfo.had.model.HadObjectOverheadCrossingList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectoverheadcrossinglist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectOverheadCrossingList} */ (
    jspb.Message.getWrapperField(this, hadobjectoverheadcrossing_pb.HadObjectOverheadCrossingList, 3));
};


/** @param {?proto.com.navinfo.had.model.HadObjectOverheadCrossingList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectoverheadcrossinglist = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectoverheadcrossinglist = function() {
  this.setHadobjectoverheadcrossinglist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectoverheadcrossinglist = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional HadObjectCurbList hadObjectCurbList = 4;
 * @return {?proto.com.navinfo.had.model.HadObjectCurbList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectcurblist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectCurbList} */ (
    jspb.Message.getWrapperField(this, hadobjectcurb_pb.HadObjectCurbList, 4));
};


/** @param {?proto.com.navinfo.had.model.HadObjectCurbList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectcurblist = function(value) {
  jspb.Message.setWrapperField(this, 4, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectcurblist = function() {
  this.setHadobjectcurblist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectcurblist = function() {
  return jspb.Message.getField(this, 4) != null;
};


/**
 * optional HadObjectLinePoleList hadObjectLinePoleList = 5;
 * @return {?proto.com.navinfo.had.model.HadObjectLinePoleList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectlinepolelist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectLinePoleList} */ (
    jspb.Message.getWrapperField(this, hadobjectlinepole_pb.HadObjectLinePoleList, 5));
};


/** @param {?proto.com.navinfo.had.model.HadObjectLinePoleList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectlinepolelist = function(value) {
  jspb.Message.setWrapperField(this, 5, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectlinepolelist = function() {
  this.setHadobjectlinepolelist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectlinepolelist = function() {
  return jspb.Message.getField(this, 5) != null;
};


/**
 * optional HadObjectTrafficBarrierList hadObjectTrafficBarrierList = 6;
 * @return {?proto.com.navinfo.had.model.HadObjectTrafficBarrierList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjecttrafficbarrierlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectTrafficBarrierList} */ (
    jspb.Message.getWrapperField(this, hadobjecttrafficbarrier_pb.HadObjectTrafficBarrierList, 6));
};


/** @param {?proto.com.navinfo.had.model.HadObjectTrafficBarrierList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjecttrafficbarrierlist = function(value) {
  jspb.Message.setWrapperField(this, 6, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjecttrafficbarrierlist = function() {
  this.setHadobjecttrafficbarrierlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjecttrafficbarrierlist = function() {
  return jspb.Message.getField(this, 6) != null;
};


/**
 * optional HadObjectMessageSignList hadObjectMessageSignList = 7;
 * @return {?proto.com.navinfo.had.model.HadObjectMessageSignList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectmessagesignlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectMessageSignList} */ (
    jspb.Message.getWrapperField(this, hadobjectmessagesign_pb.HadObjectMessageSignList, 7));
};


/** @param {?proto.com.navinfo.had.model.HadObjectMessageSignList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectmessagesignlist = function(value) {
  jspb.Message.setWrapperField(this, 7, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectmessagesignlist = function() {
  this.setHadobjectmessagesignlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectmessagesignlist = function() {
  return jspb.Message.getField(this, 7) != null;
};


/**
 * optional HadObjectOverheadStructureList hadObjectOverheadStructureList = 8;
 * @return {?proto.com.navinfo.had.model.HadObjectOverheadStructureList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectoverheadstructurelist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectOverheadStructureList} */ (
    jspb.Message.getWrapperField(this, hadobjectoverheadstructure_pb.HadObjectOverheadStructureList, 8));
};


/** @param {?proto.com.navinfo.had.model.HadObjectOverheadStructureList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectoverheadstructurelist = function(value) {
  jspb.Message.setWrapperField(this, 8, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectoverheadstructurelist = function() {
  this.setHadobjectoverheadstructurelist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectoverheadstructurelist = function() {
  return jspb.Message.getField(this, 8) != null;
};


/**
 * optional HadObjectTunnelList hadObjectTunnelList = 9;
 * @return {?proto.com.navinfo.had.model.HadObjectTunnelList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjecttunnellist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectTunnelList} */ (
    jspb.Message.getWrapperField(this, hadobjecttunnel_pb.HadObjectTunnelList, 9));
};


/** @param {?proto.com.navinfo.had.model.HadObjectTunnelList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjecttunnellist = function(value) {
  jspb.Message.setWrapperField(this, 9, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjecttunnellist = function() {
  this.setHadobjecttunnellist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjecttunnellist = function() {
  return jspb.Message.getField(this, 9) != null;
};


/**
 * optional HadObjectDelineatorList hadObjectDelineatorList = 10;
 * @return {?proto.com.navinfo.had.model.HadObjectDelineatorList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectdelineatorlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectDelineatorList} */ (
    jspb.Message.getWrapperField(this, hadobjectdelineator_pb.HadObjectDelineatorList, 10));
};


/** @param {?proto.com.navinfo.had.model.HadObjectDelineatorList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectdelineatorlist = function(value) {
  jspb.Message.setWrapperField(this, 10, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectdelineatorlist = function() {
  this.setHadobjectdelineatorlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectdelineatorlist = function() {
  return jspb.Message.getField(this, 10) != null;
};


/**
 * optional HadObjectTollBoothList hadObjectTollBoothList = 11;
 * @return {?proto.com.navinfo.had.model.HadObjectTollBoothList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjecttollboothlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectTollBoothList} */ (
    jspb.Message.getWrapperField(this, hadobjecttollbooth_pb.HadObjectTollBoothList, 11));
};


/** @param {?proto.com.navinfo.had.model.HadObjectTollBoothList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjecttollboothlist = function(value) {
  jspb.Message.setWrapperField(this, 11, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjecttollboothlist = function() {
  this.setHadobjecttollboothlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjecttollboothlist = function() {
  return jspb.Message.getField(this, 11) != null;
};


/**
 * optional HadObjectCallBoxList hadObjectCallBoxList = 12;
 * @return {?proto.com.navinfo.had.model.HadObjectCallBoxList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectcallboxlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectCallBoxList} */ (
    jspb.Message.getWrapperField(this, hadobjectcallbox_pb.HadObjectCallBoxList, 12));
};


/** @param {?proto.com.navinfo.had.model.HadObjectCallBoxList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectcallboxlist = function(value) {
  jspb.Message.setWrapperField(this, 12, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectcallboxlist = function() {
  this.setHadobjectcallboxlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectcallboxlist = function() {
  return jspb.Message.getField(this, 12) != null;
};


/**
 * optional HadObjectDitchList hadObjectDitchList = 13;
 * @return {?proto.com.navinfo.had.model.HadObjectDitchList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectditchlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectDitchList} */ (
    jspb.Message.getWrapperField(this, hadobjectditch_pb.HadObjectDitchList, 13));
};


/** @param {?proto.com.navinfo.had.model.HadObjectDitchList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectditchlist = function(value) {
  jspb.Message.setWrapperField(this, 13, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectditchlist = function() {
  this.setHadobjectditchlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectditchlist = function() {
  return jspb.Message.getField(this, 13) != null;
};


/**
 * optional HadObjectWallList hadObjectWallList = 14;
 * @return {?proto.com.navinfo.had.model.HadObjectWallList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectwalllist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectWallList} */ (
    jspb.Message.getWrapperField(this, hadobjectwall_pb.HadObjectWallList, 14));
};


/** @param {?proto.com.navinfo.had.model.HadObjectWallList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectwalllist = function(value) {
  jspb.Message.setWrapperField(this, 14, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectwalllist = function() {
  this.setHadobjectwalllist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectwalllist = function() {
  return jspb.Message.getField(this, 14) != null;
};


/**
 * optional HadObjectWallPerpendicularList hadObjectWallPerpendicularList = 15;
 * @return {?proto.com.navinfo.had.model.HadObjectWallPerpendicularList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectwallperpendicularlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectWallPerpendicularList} */ (
    jspb.Message.getWrapperField(this, hadobjectwallperpendicular_pb.HadObjectWallPerpendicularList, 15));
};


/** @param {?proto.com.navinfo.had.model.HadObjectWallPerpendicularList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectwallperpendicularlist = function(value) {
  jspb.Message.setWrapperField(this, 15, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectwallperpendicularlist = function() {
  this.setHadobjectwallperpendicularlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectwallperpendicularlist = function() {
  return jspb.Message.getField(this, 15) != null;
};


/**
 * optional HadObjectArrowList hadObjectArrowList = 16;
 * @return {?proto.com.navinfo.had.model.HadObjectArrowList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectarrowlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectArrowList} */ (
    jspb.Message.getWrapperField(this, hadobjectarrow_pb.HadObjectArrowList, 16));
};


/** @param {?proto.com.navinfo.had.model.HadObjectArrowList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectarrowlist = function(value) {
  jspb.Message.setWrapperField(this, 16, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectarrowlist = function() {
  this.setHadobjectarrowlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectarrowlist = function() {
  return jspb.Message.getField(this, 16) != null;
};


/**
 * optional HadObjectTextList hadObjectTextList = 17;
 * @return {?proto.com.navinfo.had.model.HadObjectTextList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjecttextlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectTextList} */ (
    jspb.Message.getWrapperField(this, hadobjecttext_pb.HadObjectTextList, 17));
};


/** @param {?proto.com.navinfo.had.model.HadObjectTextList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjecttextlist = function(value) {
  jspb.Message.setWrapperField(this, 17, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjecttextlist = function() {
  this.setHadobjecttextlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjecttextlist = function() {
  return jspb.Message.getField(this, 17) != null;
};


/**
 * optional HadObjectSymbolList hadObjectSymbolList = 18;
 * @return {?proto.com.navinfo.had.model.HadObjectSymbolList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectsymbollist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectSymbolList} */ (
    jspb.Message.getWrapperField(this, hadobjectsymbol_pb.HadObjectSymbolList, 18));
};


/** @param {?proto.com.navinfo.had.model.HadObjectSymbolList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectsymbollist = function(value) {
  jspb.Message.setWrapperField(this, 18, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectsymbollist = function() {
  this.setHadobjectsymbollist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectsymbollist = function() {
  return jspb.Message.getField(this, 18) != null;
};


/**
 * optional HadObjectWarningAreaList hadObjectWarningAreaList = 19;
 * @return {?proto.com.navinfo.had.model.HadObjectWarningAreaList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectwarningarealist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectWarningAreaList} */ (
    jspb.Message.getWrapperField(this, hadobjectwarningarea_pb.HadObjectWarningAreaList, 19));
};


/** @param {?proto.com.navinfo.had.model.HadObjectWarningAreaList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectwarningarealist = function(value) {
  jspb.Message.setWrapperField(this, 19, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectwarningarealist = function() {
  this.setHadobjectwarningarealist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectwarningarealist = function() {
  return jspb.Message.getField(this, 19) != null;
};


/**
 * optional HadObjectFillAreaList hadObjectFillAreaList = 20;
 * @return {?proto.com.navinfo.had.model.HadObjectFillAreaList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectfillarealist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectFillAreaList} */ (
    jspb.Message.getWrapperField(this, hadobjectfillarea_pb.HadObjectFillAreaList, 20));
};


/** @param {?proto.com.navinfo.had.model.HadObjectFillAreaList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectfillarealist = function(value) {
  jspb.Message.setWrapperField(this, 20, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectfillarealist = function() {
  this.setHadobjectfillarealist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectfillarealist = function() {
  return jspb.Message.getField(this, 20) != null;
};


/**
 * optional HadObjectTrafficLightsList hadObjectTrafficLightsList = 21;
 * @return {?proto.com.navinfo.had.model.HadObjectTrafficLightsList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjecttrafficlightslist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectTrafficLightsList} */ (
    jspb.Message.getWrapperField(this, hadobjecttrafficlights_pb.HadObjectTrafficLightsList, 21));
};


/** @param {?proto.com.navinfo.had.model.HadObjectTrafficLightsList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjecttrafficlightslist = function(value) {
  jspb.Message.setWrapperField(this, 21, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjecttrafficlightslist = function() {
  this.setHadobjecttrafficlightslist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjecttrafficlightslist = function() {
  return jspb.Message.getField(this, 21) != null;
};


/**
 * optional HadObjectBuildingList hadObjectBuildingList = 22;
 * @return {?proto.com.navinfo.had.model.HadObjectBuildingList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectbuildinglist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectBuildingList} */ (
    jspb.Message.getWrapperField(this, hadobjectbuilding_pb.HadObjectBuildingList, 22));
};


/** @param {?proto.com.navinfo.had.model.HadObjectBuildingList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectbuildinglist = function(value) {
  jspb.Message.setWrapperField(this, 22, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectbuildinglist = function() {
  this.setHadobjectbuildinglist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectbuildinglist = function() {
  return jspb.Message.getField(this, 22) != null;
};


/**
 * optional HadObjectStopLocationList hadObjectStopLocationList = 23;
 * @return {?proto.com.navinfo.had.model.HadObjectStopLocationList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectstoplocationlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectStopLocationList} */ (
    jspb.Message.getWrapperField(this, hadobjectstoplocation_pb.HadObjectStopLocationList, 23));
};


/** @param {?proto.com.navinfo.had.model.HadObjectStopLocationList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectstoplocationlist = function(value) {
  jspb.Message.setWrapperField(this, 23, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectstoplocationlist = function() {
  this.setHadobjectstoplocationlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectstoplocationlist = function() {
  return jspb.Message.getField(this, 23) != null;
};


/**
 * optional HadObjectCrossWalkList hadObjectCrossWalkList = 24;
 * @return {?proto.com.navinfo.had.model.HadObjectCrossWalkList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectcrosswalklist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectCrossWalkList} */ (
    jspb.Message.getWrapperField(this, hadobjectcrosswalk_pb.HadObjectCrossWalkList, 24));
};


/** @param {?proto.com.navinfo.had.model.HadObjectCrossWalkList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectcrosswalklist = function(value) {
  jspb.Message.setWrapperField(this, 24, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectcrosswalklist = function() {
  this.setHadobjectcrosswalklist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectcrosswalklist = function() {
  return jspb.Message.getField(this, 24) != null;
};


/**
 * optional HadObjectBusStopList hadObjectBusStopList = 25;
 * @return {?proto.com.navinfo.had.model.HadObjectBusStopList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectbusstoplist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectBusStopList} */ (
    jspb.Message.getWrapperField(this, hadobjectbusstop_pb.HadObjectBusStopList, 25));
};


/** @param {?proto.com.navinfo.had.model.HadObjectBusStopList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectbusstoplist = function(value) {
  jspb.Message.setWrapperField(this, 25, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectbusstoplist = function() {
  this.setHadobjectbusstoplist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectbusstoplist = function() {
  return jspb.Message.getField(this, 25) != null;
};


/**
 * optional HadObjectSpeedBumpList hadObjectSpeedBumpList = 26;
 * @return {?proto.com.navinfo.had.model.HadObjectSpeedBumpList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectspeedbumplist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectSpeedBumpList} */ (
    jspb.Message.getWrapperField(this, hadobjectspeedbump_pb.HadObjectSpeedBumpList, 26));
};


/** @param {?proto.com.navinfo.had.model.HadObjectSpeedBumpList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectspeedbumplist = function(value) {
  jspb.Message.setWrapperField(this, 26, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectspeedbumplist = function() {
  this.setHadobjectspeedbumplist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectspeedbumplist = function() {
  return jspb.Message.getField(this, 26) != null;
};


/**
 * optional HadObjectCrossBikeList hadObjectCrossBikeList = 27;
 * @return {?proto.com.navinfo.had.model.HadObjectCrossBikeList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectcrossbikelist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectCrossBikeList} */ (
    jspb.Message.getWrapperField(this, hadobjectcrossbike_pb.HadObjectCrossBikeList, 27));
};


/** @param {?proto.com.navinfo.had.model.HadObjectCrossBikeList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectcrossbikelist = function(value) {
  jspb.Message.setWrapperField(this, 27, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectcrossbikelist = function() {
  this.setHadobjectcrossbikelist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectcrossbikelist = function() {
  return jspb.Message.getField(this, 27) != null;
};


/**
 * optional HadObjectPillarList hadObjectPillarList = 28;
 * @return {?proto.com.navinfo.had.model.HadObjectPillarList}
 */
proto.com.navinfo.had.model.HadObjects.prototype.getHadobjectpillarlist = function() {
  return /** @type{?proto.com.navinfo.had.model.HadObjectPillarList} */ (
    jspb.Message.getWrapperField(this, hadobjectpillar_pb.HadObjectPillarList, 28));
};


/** @param {?proto.com.navinfo.had.model.HadObjectPillarList|undefined} value */
proto.com.navinfo.had.model.HadObjects.prototype.setHadobjectpillarlist = function(value) {
  jspb.Message.setWrapperField(this, 28, value);
};


proto.com.navinfo.had.model.HadObjects.prototype.clearHadobjectpillarlist = function() {
  this.setHadobjectpillarlist(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjects.prototype.hasHadobjectpillarlist = function() {
  return jspb.Message.getField(this, 28) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./hadlanelink_pb.js":7,"./hadlanemarklink_pb.js":8,"./hadlink_pb.js":9,"./hadobjectarrow_pb.js":10,"./hadobjectbuilding_pb.js":11,"./hadobjectbusstop_pb.js":12,"./hadobjectcallbox_pb.js":13,"./hadobjectcrossbike_pb.js":14,"./hadobjectcrosswalk_pb.js":15,"./hadobjectcurb_pb.js":16,"./hadobjectdelineator_pb.js":17,"./hadobjectditch_pb.js":18,"./hadobjectfillarea_pb.js":19,"./hadobjectlinepole_pb.js":20,"./hadobjectmessagesign_pb.js":21,"./hadobjectoverheadcrossing_pb.js":22,"./hadobjectoverheadstructure_pb.js":23,"./hadobjectpillar_pb.js":24,"./hadobjectpole_pb.js":25,"./hadobjectspeedbump_pb.js":26,"./hadobjectstoplocation_pb.js":27,"./hadobjectsymbol_pb.js":28,"./hadobjecttext_pb.js":29,"./hadobjecttollbooth_pb.js":30,"./hadobjecttrafficbarrier_pb.js":31,"./hadobjecttrafficlights_pb.js":32,"./hadobjecttrafficsign_pb.js":33,"./hadobjecttunnel_pb.js":34,"./hadobjectwall_pb.js":35,"./hadobjectwallperpendicular_pb.js":36,"./hadobjectwarningarea_pb.js":37,"google-protobuf":38}],7:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadLaneLink', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadLaneLinkList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLaneLinkList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadLaneLinkList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLaneLinkList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLaneLinkList.displayName = 'proto.com.navinfo.had.model.HadLaneLinkList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadLaneLinkList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLaneLinkList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLaneLinkList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLaneLinkList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneLinkList.toObject = function(includeInstance, msg) {
  var f, obj = {
    linkList: jspb.Message.toObjectList(msg.getLinkList(),
    proto.com.navinfo.had.model.HadLaneLink.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLaneLinkList}
 */
proto.com.navinfo.had.model.HadLaneLinkList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLaneLinkList;
  return proto.com.navinfo.had.model.HadLaneLinkList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLaneLinkList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLaneLinkList}
 */
proto.com.navinfo.had.model.HadLaneLinkList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadLaneLink;
      reader.readMessage(value,proto.com.navinfo.had.model.HadLaneLink.deserializeBinaryFromReader);
      msg.addLink(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLaneLinkList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLaneLinkList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLaneLinkList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneLinkList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLinkList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadLaneLink.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadLaneLink link = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadLaneLink>}
 */
proto.com.navinfo.had.model.HadLaneLinkList.prototype.getLinkList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadLaneLink>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadLaneLink, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadLaneLink>} value */
proto.com.navinfo.had.model.HadLaneLinkList.prototype.setLinkList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadLaneLink=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadLaneLink}
 */
proto.com.navinfo.had.model.HadLaneLinkList.prototype.addLink = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadLaneLink, opt_index);
};


proto.com.navinfo.had.model.HadLaneLinkList.prototype.clearLinkList = function() {
  this.setLinkList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLaneLink = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLaneLink, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLaneLink.displayName = 'proto.com.navinfo.had.model.HadLaneLink';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLaneLink.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLaneLink} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneLink.toObject = function(includeInstance, msg) {
  var f, obj = {
    lanelinkpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    linkpid: jspb.Message.getFieldWithDefault(msg, 2, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    leftlanemarklinkpid: jspb.Message.getFieldWithDefault(msg, 4, 0),
    rightlanemarklinkpid: jspb.Message.getFieldWithDefault(msg, 5, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLaneLink}
 */
proto.com.navinfo.had.model.HadLaneLink.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLaneLink;
  return proto.com.navinfo.had.model.HadLaneLink.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLaneLink} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLaneLink}
 */
proto.com.navinfo.had.model.HadLaneLink.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setLanelinkpid(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setLinkpid(value);
      break;
    case 3:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setLeftlanemarklinkpid(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setRightlanemarklinkpid(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLaneLink.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLaneLink} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneLink.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLanelinkpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getLinkpid();
  if (f !== 0) {
    writer.writeSint64(
      2,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      3,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getLeftlanemarklinkpid();
  if (f !== 0) {
    writer.writeSint64(
      4,
      f
    );
  }
  f = message.getRightlanemarklinkpid();
  if (f !== 0) {
    writer.writeSint64(
      5,
      f
    );
  }
};


/**
 * optional sint64 laneLinkPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.getLanelinkpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneLink.prototype.setLanelinkpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional sint64 linkPid = 2;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.getLinkpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneLink.prototype.setLinkpid = function(value) {
  jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional geometry.LineString geometry = 3;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 3));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadLaneLink.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 3, value);
};


proto.com.navinfo.had.model.HadLaneLink.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 3) != null;
};


/**
 * optional sint64 leftLaneMarkLinkPid = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.getLeftlanemarklinkpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneLink.prototype.setLeftlanemarklinkpid = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint64 rightLaneMarkLinkPid = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneLink.prototype.getRightlanemarklinkpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneLink.prototype.setRightlanemarklinkpid = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],8:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadLaneMarkLink', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadLaneMarkLinkList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadLaneMarkLinkList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLaneMarkLinkList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLaneMarkLinkList.displayName = 'proto.com.navinfo.had.model.HadLaneMarkLinkList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLaneMarkLinkList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLinkList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.toObject = function(includeInstance, msg) {
  var f, obj = {
    linkList: jspb.Message.toObjectList(msg.getLinkList(),
    proto.com.navinfo.had.model.HadLaneMarkLink.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLaneMarkLinkList}
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLaneMarkLinkList;
  return proto.com.navinfo.had.model.HadLaneMarkLinkList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLinkList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLaneMarkLinkList}
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadLaneMarkLink;
      reader.readMessage(value,proto.com.navinfo.had.model.HadLaneMarkLink.deserializeBinaryFromReader);
      msg.addLink(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLaneMarkLinkList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLinkList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLinkList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadLaneMarkLink.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadLaneMarkLink link = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadLaneMarkLink>}
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.prototype.getLinkList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadLaneMarkLink>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadLaneMarkLink, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadLaneMarkLink>} value */
proto.com.navinfo.had.model.HadLaneMarkLinkList.prototype.setLinkList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLink=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadLaneMarkLink}
 */
proto.com.navinfo.had.model.HadLaneMarkLinkList.prototype.addLink = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadLaneMarkLink, opt_index);
};


proto.com.navinfo.had.model.HadLaneMarkLinkList.prototype.clearLinkList = function() {
  this.setLinkList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLaneMarkLink = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLaneMarkLink, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLaneMarkLink.displayName = 'proto.com.navinfo.had.model.HadLaneMarkLink';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLaneMarkLink.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLink} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneMarkLink.toObject = function(includeInstance, msg) {
  var f, obj = {
    lanemarklinkpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    boundarytype: jspb.Message.getFieldWithDefault(msg, 3, 0),
    markType: jspb.Message.getFieldWithDefault(msg, 4, 0),
    markColor: jspb.Message.getFieldWithDefault(msg, 5, 0),
    markWidth: jspb.Message.getFieldWithDefault(msg, 6, 0),
    markMaterial: jspb.Message.getFieldWithDefault(msg, 7, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLaneMarkLink}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLaneMarkLink;
  return proto.com.navinfo.had.model.HadLaneMarkLink.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLink} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLaneMarkLink}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setLanemarklinkpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setBoundarytype(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMarkType(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMarkColor(value);
      break;
    case 6:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMarkWidth(value);
      break;
    case 7:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMarkMaterial(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLaneMarkLink.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLaneMarkLink} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLaneMarkLink.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLanemarklinkpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getBoundarytype();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getMarkType();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getMarkColor();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
  f = message.getMarkWidth();
  if (f !== 0) {
    writer.writeSint32(
      6,
      f
    );
  }
  f = message.getMarkMaterial();
  if (f !== 0) {
    writer.writeSint32(
      7,
      f
    );
  }
};


/**
 * optional sint64 laneMarkLinkPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getLanemarklinkpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setLanemarklinkpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadLaneMarkLink.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 boundaryType = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getBoundarytype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setBoundarytype = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 mark_type = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getMarkType = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setMarkType = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 mark_color = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getMarkColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setMarkColor = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional sint32 mark_width = 6;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getMarkWidth = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setMarkWidth = function(value) {
  jspb.Message.setProto3IntField(this, 6, value);
};


/**
 * optional sint32 mark_material = 7;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.getMarkMaterial = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 7, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLaneMarkLink.prototype.setMarkMaterial = function(value) {
  jspb.Message.setProto3IntField(this, 7, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],9:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadLink', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadLinkList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLinkList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadLinkList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLinkList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLinkList.displayName = 'proto.com.navinfo.had.model.HadLinkList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadLinkList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLinkList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLinkList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLinkList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLinkList.toObject = function(includeInstance, msg) {
  var f, obj = {
    linkList: jspb.Message.toObjectList(msg.getLinkList(),
    proto.com.navinfo.had.model.HadLink.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLinkList}
 */
proto.com.navinfo.had.model.HadLinkList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLinkList;
  return proto.com.navinfo.had.model.HadLinkList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLinkList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLinkList}
 */
proto.com.navinfo.had.model.HadLinkList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadLink;
      reader.readMessage(value,proto.com.navinfo.had.model.HadLink.deserializeBinaryFromReader);
      msg.addLink(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLinkList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLinkList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLinkList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLinkList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLinkList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadLink.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadLink link = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadLink>}
 */
proto.com.navinfo.had.model.HadLinkList.prototype.getLinkList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadLink>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadLink, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadLink>} value */
proto.com.navinfo.had.model.HadLinkList.prototype.setLinkList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadLink=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadLink}
 */
proto.com.navinfo.had.model.HadLinkList.prototype.addLink = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadLink, opt_index);
};


proto.com.navinfo.had.model.HadLinkList.prototype.clearLinkList = function() {
  this.setLinkList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadLink = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadLink, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadLink.displayName = 'proto.com.navinfo.had.model.HadLink';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadLink.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadLink.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadLink} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLink.toObject = function(includeInstance, msg) {
  var f, obj = {
    linkpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    isrefline: jspb.Message.getFieldWithDefault(msg, 3, 0),
    kind: jspb.Message.getFieldWithDefault(msg, 4, 0),
    multidigitized: jspb.Message.getFieldWithDefault(msg, 5, 0),
    direct: jspb.Message.getFieldWithDefault(msg, 6, 0),
    tollinfo: jspb.Message.getFieldWithDefault(msg, 7, 0),
    functionclass: jspb.Message.getFieldWithDefault(msg, 8, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadLink}
 */
proto.com.navinfo.had.model.HadLink.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadLink;
  return proto.com.navinfo.had.model.HadLink.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadLink} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadLink}
 */
proto.com.navinfo.had.model.HadLink.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setLinkpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setIsrefline(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setKind(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMultidigitized(value);
      break;
    case 6:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setDirect(value);
      break;
    case 7:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setTollinfo(value);
      break;
    case 8:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setFunctionclass(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadLink.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadLink.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadLink} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadLink.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getLinkpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getIsrefline();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getKind();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getMultidigitized();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
  f = message.getDirect();
  if (f !== 0) {
    writer.writeSint32(
      6,
      f
    );
  }
  f = message.getTollinfo();
  if (f !== 0) {
    writer.writeSint32(
      7,
      f
    );
  }
  f = message.getFunctionclass();
  if (f !== 0) {
    writer.writeSint32(
      8,
      f
    );
  }
};


/**
 * optional sint64 linkPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getLinkpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setLinkpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadLink.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadLink.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadLink.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadLink.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 isRefline = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getIsrefline = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setIsrefline = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 kind = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getKind = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setKind = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 multiDigitized = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getMultidigitized = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setMultidigitized = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional sint32 direct = 6;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getDirect = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setDirect = function(value) {
  jspb.Message.setProto3IntField(this, 6, value);
};


/**
 * optional sint32 tollInfo = 7;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getTollinfo = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 7, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setTollinfo = function(value) {
  jspb.Message.setProto3IntField(this, 7, value);
};


/**
 * optional sint32 functionClass = 8;
 * @return {number}
 */
proto.com.navinfo.had.model.HadLink.prototype.getFunctionclass = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 8, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadLink.prototype.setFunctionclass = function(value) {
  jspb.Message.setProto3IntField(this, 8, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],10:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectArrow', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectArrowList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectArrowList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectArrowList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectArrowList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectArrowList.displayName = 'proto.com.navinfo.had.model.HadObjectArrowList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectArrowList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectArrowList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectArrowList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectArrowList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectArrowList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectArrow.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectArrowList}
 */
proto.com.navinfo.had.model.HadObjectArrowList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectArrowList;
  return proto.com.navinfo.had.model.HadObjectArrowList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectArrowList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectArrowList}
 */
proto.com.navinfo.had.model.HadObjectArrowList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectArrow;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectArrow.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectArrowList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectArrowList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectArrowList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectArrowList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectArrow.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectArrow object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectArrow>}
 */
proto.com.navinfo.had.model.HadObjectArrowList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectArrow>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectArrow, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectArrow>} value */
proto.com.navinfo.had.model.HadObjectArrowList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectArrow=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectArrow}
 */
proto.com.navinfo.had.model.HadObjectArrowList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectArrow, opt_index);
};


proto.com.navinfo.had.model.HadObjectArrowList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectArrow = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectArrow, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectArrow.displayName = 'proto.com.navinfo.had.model.HadObjectArrow';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectArrow.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectArrow} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectArrow.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    length: jspb.Message.getFieldWithDefault(msg, 3, 0),
    width: jspb.Message.getFieldWithDefault(msg, 4, 0),
    color: jspb.Message.getFieldWithDefault(msg, 5, 0),
    arrowclass: jspb.Message.getFieldWithDefault(msg, 6, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectArrow}
 */
proto.com.navinfo.had.model.HadObjectArrow.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectArrow;
  return proto.com.navinfo.had.model.HadObjectArrow.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectArrow} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectArrow}
 */
proto.com.navinfo.had.model.HadObjectArrow.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setLength(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setWidth(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    case 6:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setArrowclass(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectArrow.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectArrow} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectArrow.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getLength();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getWidth();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
  f = message.getArrowclass();
  if (f !== 0) {
    writer.writeSint32(
      6,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectArrow.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectArrow.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectArrow.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 length = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.getLength = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectArrow.prototype.setLength = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 width = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.getWidth = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectArrow.prototype.setWidth = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 color = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectArrow.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional sint32 arrowClass = 6;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectArrow.prototype.getArrowclass = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectArrow.prototype.setArrowclass = function(value) {
  jspb.Message.setProto3IntField(this, 6, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],11:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectBuilding', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectBuildingList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectBuildingList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectBuildingList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectBuildingList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectBuildingList.displayName = 'proto.com.navinfo.had.model.HadObjectBuildingList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectBuildingList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectBuildingList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectBuildingList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectBuildingList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBuildingList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectBuilding.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectBuildingList}
 */
proto.com.navinfo.had.model.HadObjectBuildingList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectBuildingList;
  return proto.com.navinfo.had.model.HadObjectBuildingList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectBuildingList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectBuildingList}
 */
proto.com.navinfo.had.model.HadObjectBuildingList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectBuilding;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectBuilding.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectBuildingList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectBuildingList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectBuildingList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBuildingList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectBuilding.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectBuilding object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectBuilding>}
 */
proto.com.navinfo.had.model.HadObjectBuildingList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectBuilding>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectBuilding, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectBuilding>} value */
proto.com.navinfo.had.model.HadObjectBuildingList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectBuilding=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectBuilding}
 */
proto.com.navinfo.had.model.HadObjectBuildingList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectBuilding, opt_index);
};


proto.com.navinfo.had.model.HadObjectBuildingList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectBuilding = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectBuilding, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectBuilding.displayName = 'proto.com.navinfo.had.model.HadObjectBuilding';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectBuilding.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectBuilding} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBuilding.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    type: jspb.Message.getFieldWithDefault(msg, 3, 0),
    height: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectBuilding}
 */
proto.com.navinfo.had.model.HadObjectBuilding.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectBuilding;
  return proto.com.navinfo.had.model.HadObjectBuilding.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectBuilding} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectBuilding}
 */
proto.com.navinfo.had.model.HadObjectBuilding.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setType(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHeight(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectBuilding.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectBuilding} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBuilding.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getType();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getHeight();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectBuilding.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 type = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.getType = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.setType = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 height = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectBuilding.prototype.setHeight = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],12:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectBusStop', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectBusStopList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectBusStopList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectBusStopList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectBusStopList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectBusStopList.displayName = 'proto.com.navinfo.had.model.HadObjectBusStopList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectBusStopList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectBusStopList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectBusStopList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectBusStopList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBusStopList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectBusStop.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectBusStopList}
 */
proto.com.navinfo.had.model.HadObjectBusStopList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectBusStopList;
  return proto.com.navinfo.had.model.HadObjectBusStopList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectBusStopList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectBusStopList}
 */
proto.com.navinfo.had.model.HadObjectBusStopList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectBusStop;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectBusStop.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectBusStopList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectBusStopList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectBusStopList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBusStopList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectBusStop.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectBusStop object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectBusStop>}
 */
proto.com.navinfo.had.model.HadObjectBusStopList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectBusStop>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectBusStop, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectBusStop>} value */
proto.com.navinfo.had.model.HadObjectBusStopList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectBusStop=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectBusStop}
 */
proto.com.navinfo.had.model.HadObjectBusStopList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectBusStop, opt_index);
};


proto.com.navinfo.had.model.HadObjectBusStopList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectBusStop = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectBusStop, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectBusStop.displayName = 'proto.com.navinfo.had.model.HadObjectBusStop';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectBusStop.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectBusStop} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBusStop.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    stoptype: jspb.Message.getFieldWithDefault(msg, 3, 0),
    hasmarking: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectBusStop}
 */
proto.com.navinfo.had.model.HadObjectBusStop.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectBusStop;
  return proto.com.navinfo.had.model.HadObjectBusStop.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectBusStop} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectBusStop}
 */
proto.com.navinfo.had.model.HadObjectBusStop.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setStoptype(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHasmarking(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectBusStop.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectBusStop} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectBusStop.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getStoptype();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getHasmarking();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectBusStop.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 stopType = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.getStoptype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.setStoptype = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 hasMarking = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.getHasmarking = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectBusStop.prototype.setHasmarking = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],13:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCallBox', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCallBoxList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCallBoxList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectCallBoxList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCallBoxList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCallBoxList.displayName = 'proto.com.navinfo.had.model.HadObjectCallBoxList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCallBoxList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCallBoxList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectCallBox.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCallBoxList}
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCallBoxList;
  return proto.com.navinfo.had.model.HadObjectCallBoxList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCallBoxList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCallBoxList}
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectCallBox;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectCallBox.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCallBoxList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCallBoxList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectCallBox.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectCallBox object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectCallBox>}
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectCallBox>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectCallBox, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectCallBox>} value */
proto.com.navinfo.had.model.HadObjectCallBoxList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectCallBox=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectCallBox}
 */
proto.com.navinfo.had.model.HadObjectCallBoxList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectCallBox, opt_index);
};


proto.com.navinfo.had.model.HadObjectCallBoxList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCallBox = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCallBox, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCallBox.displayName = 'proto.com.navinfo.had.model.HadObjectCallBox';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCallBox.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCallBox} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCallBox.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    height: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCallBox}
 */
proto.com.navinfo.had.model.HadObjectCallBox.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCallBox;
  return proto.com.navinfo.had.model.HadObjectCallBox.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCallBox} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCallBox}
 */
proto.com.navinfo.had.model.HadObjectCallBox.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHeight(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCallBox.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCallBox} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCallBox.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getHeight();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectCallBox.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 height = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCallBox.prototype.setHeight = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],14:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCrossBike', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCrossBikeList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectCrossBikeList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCrossBikeList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCrossBikeList.displayName = 'proto.com.navinfo.had.model.HadObjectCrossBikeList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCrossBikeList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBikeList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectCrossBike.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossBikeList}
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCrossBikeList;
  return proto.com.navinfo.had.model.HadObjectCrossBikeList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBikeList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossBikeList}
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectCrossBike;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectCrossBike.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCrossBikeList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBikeList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectCrossBike.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectCrossBike object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectCrossBike>}
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectCrossBike>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectCrossBike, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectCrossBike>} value */
proto.com.navinfo.had.model.HadObjectCrossBikeList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBike=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectCrossBike}
 */
proto.com.navinfo.had.model.HadObjectCrossBikeList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectCrossBike, opt_index);
};


proto.com.navinfo.had.model.HadObjectCrossBikeList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCrossBike = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCrossBike, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCrossBike.displayName = 'proto.com.navinfo.had.model.HadObjectCrossBike';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCrossBike.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBike} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossBike.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossBike}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCrossBike;
  return proto.com.navinfo.had.model.HadObjectCrossBike.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBike} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossBike}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCrossBike.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossBike} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossBike.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectCrossBike.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectCrossBike.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],15:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCrossWalk', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCrossWalkList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectCrossWalkList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCrossWalkList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCrossWalkList.displayName = 'proto.com.navinfo.had.model.HadObjectCrossWalkList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCrossWalkList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalkList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectCrossWalk.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossWalkList}
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCrossWalkList;
  return proto.com.navinfo.had.model.HadObjectCrossWalkList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalkList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossWalkList}
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectCrossWalk;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectCrossWalk.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCrossWalkList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalkList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectCrossWalk.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectCrossWalk object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectCrossWalk>}
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectCrossWalk>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectCrossWalk, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectCrossWalk>} value */
proto.com.navinfo.had.model.HadObjectCrossWalkList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalk=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectCrossWalk}
 */
proto.com.navinfo.had.model.HadObjectCrossWalkList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectCrossWalk, opt_index);
};


proto.com.navinfo.had.model.HadObjectCrossWalkList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCrossWalk = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCrossWalk, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCrossWalk.displayName = 'proto.com.navinfo.had.model.HadObjectCrossWalk';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCrossWalk.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalk} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    color: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossWalk}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCrossWalk;
  return proto.com.navinfo.had.model.HadObjectCrossWalk.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalk} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCrossWalk}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCrossWalk.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCrossWalk} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 color = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCrossWalk.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],16:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCurb', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectCurbList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCurbList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectCurbList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCurbList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCurbList.displayName = 'proto.com.navinfo.had.model.HadObjectCurbList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectCurbList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCurbList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCurbList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCurbList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCurbList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectCurb.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCurbList}
 */
proto.com.navinfo.had.model.HadObjectCurbList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCurbList;
  return proto.com.navinfo.had.model.HadObjectCurbList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCurbList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCurbList}
 */
proto.com.navinfo.had.model.HadObjectCurbList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectCurb;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectCurb.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCurbList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCurbList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCurbList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCurbList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectCurb.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectCurb object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectCurb>}
 */
proto.com.navinfo.had.model.HadObjectCurbList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectCurb>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectCurb, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectCurb>} value */
proto.com.navinfo.had.model.HadObjectCurbList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectCurb=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectCurb}
 */
proto.com.navinfo.had.model.HadObjectCurbList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectCurb, opt_index);
};


proto.com.navinfo.had.model.HadObjectCurbList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectCurb = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectCurb, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectCurb.displayName = 'proto.com.navinfo.had.model.HadObjectCurb';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectCurb.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectCurb} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCurb.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    side: jspb.Message.getFieldWithDefault(msg, 3, 0),
    height: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectCurb}
 */
proto.com.navinfo.had.model.HadObjectCurb.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectCurb;
  return proto.com.navinfo.had.model.HadObjectCurb.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectCurb} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectCurb}
 */
proto.com.navinfo.had.model.HadObjectCurb.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setSide(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHeight(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectCurb.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectCurb} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectCurb.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getSide();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getHeight();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCurb.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectCurb.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectCurb.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 side = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.getSide = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCurb.prototype.setSide = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 height = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectCurb.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectCurb.prototype.setHeight = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],17:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectDelineator', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectDelineatorList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectDelineatorList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectDelineatorList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectDelineatorList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectDelineatorList.displayName = 'proto.com.navinfo.had.model.HadObjectDelineatorList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectDelineatorList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectDelineatorList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectDelineator.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectDelineatorList}
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectDelineatorList;
  return proto.com.navinfo.had.model.HadObjectDelineatorList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectDelineatorList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectDelineatorList}
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectDelineator;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectDelineator.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectDelineatorList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectDelineatorList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectDelineator.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectDelineator object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectDelineator>}
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectDelineator>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectDelineator, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectDelineator>} value */
proto.com.navinfo.had.model.HadObjectDelineatorList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectDelineator=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectDelineator}
 */
proto.com.navinfo.had.model.HadObjectDelineatorList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectDelineator, opt_index);
};


proto.com.navinfo.had.model.HadObjectDelineatorList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectDelineator = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectDelineator, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectDelineator.displayName = 'proto.com.navinfo.had.model.HadObjectDelineator';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectDelineator.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectDelineator} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDelineator.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    side: jspb.Message.getFieldWithDefault(msg, 3, 0),
    diametertop: jspb.Message.getFieldWithDefault(msg, 4, 0),
    diameterbottom: jspb.Message.getFieldWithDefault(msg, 5, 0),
    delineatortype: jspb.Message.getFieldWithDefault(msg, 6, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectDelineator}
 */
proto.com.navinfo.had.model.HadObjectDelineator.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectDelineator;
  return proto.com.navinfo.had.model.HadObjectDelineator.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectDelineator} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectDelineator}
 */
proto.com.navinfo.had.model.HadObjectDelineator.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setSide(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setDiametertop(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setDiameterbottom(value);
      break;
    case 6:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setDelineatortype(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectDelineator.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectDelineator} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDelineator.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getSide();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getDiametertop();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getDiameterbottom();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
  f = message.getDelineatortype();
  if (f !== 0) {
    writer.writeSint32(
      6,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectDelineator.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 side = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.getSide = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.setSide = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 diameterTop = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.getDiametertop = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.setDiametertop = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 diameterBottom = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.getDiameterbottom = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.setDiameterbottom = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional sint32 delineatorType = 6;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.getDelineatortype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDelineator.prototype.setDelineatortype = function(value) {
  jspb.Message.setProto3IntField(this, 6, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],18:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectDitch', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectDitchList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectDitchList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectDitchList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectDitchList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectDitchList.displayName = 'proto.com.navinfo.had.model.HadObjectDitchList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectDitchList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectDitchList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectDitchList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectDitchList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDitchList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectDitch.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectDitchList}
 */
proto.com.navinfo.had.model.HadObjectDitchList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectDitchList;
  return proto.com.navinfo.had.model.HadObjectDitchList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectDitchList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectDitchList}
 */
proto.com.navinfo.had.model.HadObjectDitchList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectDitch;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectDitch.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectDitchList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectDitchList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectDitchList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDitchList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectDitch.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectDitch object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectDitch>}
 */
proto.com.navinfo.had.model.HadObjectDitchList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectDitch>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectDitch, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectDitch>} value */
proto.com.navinfo.had.model.HadObjectDitchList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectDitch=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectDitch}
 */
proto.com.navinfo.had.model.HadObjectDitchList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectDitch, opt_index);
};


proto.com.navinfo.had.model.HadObjectDitchList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectDitch = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectDitch, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectDitch.displayName = 'proto.com.navinfo.had.model.HadObjectDitch';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectDitch.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectDitch.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectDitch} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDitch.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    side: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectDitch}
 */
proto.com.navinfo.had.model.HadObjectDitch.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectDitch;
  return proto.com.navinfo.had.model.HadObjectDitch.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectDitch} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectDitch}
 */
proto.com.navinfo.had.model.HadObjectDitch.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setSide(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectDitch.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectDitch.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectDitch} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectDitch.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getSide();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDitch.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDitch.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectDitch.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectDitch.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectDitch.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectDitch.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 side = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectDitch.prototype.getSide = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectDitch.prototype.setSide = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],19:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectFillArea', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectFillAreaList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectFillAreaList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectFillAreaList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectFillAreaList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectFillAreaList.displayName = 'proto.com.navinfo.had.model.HadObjectFillAreaList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectFillAreaList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectFillAreaList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectFillArea.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectFillAreaList}
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectFillAreaList;
  return proto.com.navinfo.had.model.HadObjectFillAreaList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectFillAreaList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectFillAreaList}
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectFillArea;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectFillArea.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectFillAreaList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectFillAreaList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectFillArea.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectFillArea object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectFillArea>}
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectFillArea>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectFillArea, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectFillArea>} value */
proto.com.navinfo.had.model.HadObjectFillAreaList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectFillArea=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectFillArea}
 */
proto.com.navinfo.had.model.HadObjectFillAreaList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectFillArea, opt_index);
};


proto.com.navinfo.had.model.HadObjectFillAreaList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectFillArea = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectFillArea, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectFillArea.displayName = 'proto.com.navinfo.had.model.HadObjectFillArea';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectFillArea.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectFillArea} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectFillArea.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectFillArea}
 */
proto.com.navinfo.had.model.HadObjectFillArea.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectFillArea;
  return proto.com.navinfo.had.model.HadObjectFillArea.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectFillArea} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectFillArea}
 */
proto.com.navinfo.had.model.HadObjectFillArea.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectFillArea.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectFillArea} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectFillArea.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectFillArea.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectFillArea.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],20:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectLinePole', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectLinePoleList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectLinePoleList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectLinePoleList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectLinePoleList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectLinePoleList.displayName = 'proto.com.navinfo.had.model.HadObjectLinePoleList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectLinePoleList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectLinePoleList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectLinePole.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectLinePoleList}
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectLinePoleList;
  return proto.com.navinfo.had.model.HadObjectLinePoleList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectLinePoleList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectLinePoleList}
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectLinePole;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectLinePole.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectLinePoleList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectLinePoleList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectLinePole.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectLinePole object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectLinePole>}
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectLinePole>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectLinePole, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectLinePole>} value */
proto.com.navinfo.had.model.HadObjectLinePoleList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectLinePole=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectLinePole}
 */
proto.com.navinfo.had.model.HadObjectLinePoleList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectLinePole, opt_index);
};


proto.com.navinfo.had.model.HadObjectLinePoleList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectLinePole = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectLinePole, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectLinePole.displayName = 'proto.com.navinfo.had.model.HadObjectLinePole';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectLinePole.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectLinePole} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectLinePole.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    height: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectLinePole}
 */
proto.com.navinfo.had.model.HadObjectLinePole.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectLinePole;
  return proto.com.navinfo.had.model.HadObjectLinePole.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectLinePole} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectLinePole}
 */
proto.com.navinfo.had.model.HadObjectLinePole.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHeight(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectLinePole.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectLinePole} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectLinePole.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getHeight();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectLinePole.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 height = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectLinePole.prototype.setHeight = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],21:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectMessageSign', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectMessageSignList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectMessageSignList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectMessageSignList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectMessageSignList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectMessageSignList.displayName = 'proto.com.navinfo.had.model.HadObjectMessageSignList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectMessageSignList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSignList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectMessageSign.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectMessageSignList}
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectMessageSignList;
  return proto.com.navinfo.had.model.HadObjectMessageSignList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSignList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectMessageSignList}
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectMessageSign;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectMessageSign.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectMessageSignList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSignList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectMessageSign.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectMessageSign object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectMessageSign>}
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectMessageSign>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectMessageSign, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectMessageSign>} value */
proto.com.navinfo.had.model.HadObjectMessageSignList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSign=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectMessageSign}
 */
proto.com.navinfo.had.model.HadObjectMessageSignList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectMessageSign, opt_index);
};


proto.com.navinfo.had.model.HadObjectMessageSignList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectMessageSign = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectMessageSign, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectMessageSign.displayName = 'proto.com.navinfo.had.model.HadObjectMessageSign';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectMessageSign.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSign} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectMessageSign.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    signtype: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectMessageSign}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectMessageSign;
  return proto.com.navinfo.had.model.HadObjectMessageSign.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSign} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectMessageSign}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setSigntype(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectMessageSign.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectMessageSign} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectMessageSign.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getSigntype();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectMessageSign.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 signType = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.getSigntype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectMessageSign.prototype.setSigntype = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],22:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectOverheadCrossing', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectOverheadCrossingList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectOverheadCrossingList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectOverheadCrossingList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectOverheadCrossingList.displayName = 'proto.com.navinfo.had.model.HadObjectOverheadCrossingList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectOverheadCrossingList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossingList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectOverheadCrossing.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadCrossingList}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectOverheadCrossingList;
  return proto.com.navinfo.had.model.HadObjectOverheadCrossingList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossingList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadCrossingList}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectOverheadCrossing;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectOverheadCrossing.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectOverheadCrossingList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossingList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectOverheadCrossing.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectOverheadCrossing object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectOverheadCrossing>}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectOverheadCrossing>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectOverheadCrossing, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectOverheadCrossing>} value */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossing=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadCrossing}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossingList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectOverheadCrossing, opt_index);
};


proto.com.navinfo.had.model.HadObjectOverheadCrossingList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectOverheadCrossing, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectOverheadCrossing.displayName = 'proto.com.navinfo.had.model.HadObjectOverheadCrossing';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectOverheadCrossing.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossing} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadCrossing}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectOverheadCrossing;
  return proto.com.navinfo.had.model.HadObjectOverheadCrossing.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossing} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadCrossing}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectOverheadCrossing.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadCrossing} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectOverheadCrossing.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],23:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectOverheadStructure', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectOverheadStructureList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectOverheadStructureList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectOverheadStructureList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectOverheadStructureList.displayName = 'proto.com.navinfo.had.model.HadObjectOverheadStructureList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectOverheadStructureList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructureList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectOverheadStructure.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadStructureList}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectOverheadStructureList;
  return proto.com.navinfo.had.model.HadObjectOverheadStructureList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructureList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadStructureList}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectOverheadStructure;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectOverheadStructure.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectOverheadStructureList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructureList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectOverheadStructure.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectOverheadStructure object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectOverheadStructure>}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectOverheadStructure>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectOverheadStructure, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectOverheadStructure>} value */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructure=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadStructure}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructureList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectOverheadStructure, opt_index);
};


proto.com.navinfo.had.model.HadObjectOverheadStructureList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectOverheadStructure, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectOverheadStructure.displayName = 'proto.com.navinfo.had.model.HadObjectOverheadStructure';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectOverheadStructure.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructure} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadStructure}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectOverheadStructure;
  return proto.com.navinfo.had.model.HadObjectOverheadStructure.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructure} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectOverheadStructure}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectOverheadStructure.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectOverheadStructure} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectOverheadStructure.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],24:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectPillar', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectPillarList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectPillarList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectPillarList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectPillarList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectPillarList.displayName = 'proto.com.navinfo.had.model.HadObjectPillarList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectPillarList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectPillarList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectPillarList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectPillarList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPillarList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectPillar.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectPillarList}
 */
proto.com.navinfo.had.model.HadObjectPillarList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectPillarList;
  return proto.com.navinfo.had.model.HadObjectPillarList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectPillarList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectPillarList}
 */
proto.com.navinfo.had.model.HadObjectPillarList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectPillar;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectPillar.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectPillarList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectPillarList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectPillarList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPillarList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectPillar.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectPillar object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectPillar>}
 */
proto.com.navinfo.had.model.HadObjectPillarList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectPillar>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectPillar, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectPillar>} value */
proto.com.navinfo.had.model.HadObjectPillarList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectPillar=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectPillar}
 */
proto.com.navinfo.had.model.HadObjectPillarList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectPillar, opt_index);
};


proto.com.navinfo.had.model.HadObjectPillarList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectPillar = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectPillar, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectPillar.displayName = 'proto.com.navinfo.had.model.HadObjectPillar';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectPillar.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectPillar} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPillar.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    diametertop: jspb.Message.getFieldWithDefault(msg, 3, 0),
    diameterbottom: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectPillar}
 */
proto.com.navinfo.had.model.HadObjectPillar.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectPillar;
  return proto.com.navinfo.had.model.HadObjectPillar.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectPillar} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectPillar}
 */
proto.com.navinfo.had.model.HadObjectPillar.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setDiametertop(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setDiameterbottom(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectPillar.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectPillar} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPillar.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getDiametertop();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getDiameterbottom();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectPillar.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectPillar.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectPillar.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 diameterTop = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.getDiametertop = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectPillar.prototype.setDiametertop = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 diameterBottom = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectPillar.prototype.getDiameterbottom = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectPillar.prototype.setDiameterbottom = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],25:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectPole', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectPoleList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectPoleList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectPoleList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectPoleList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectPoleList.displayName = 'proto.com.navinfo.had.model.HadObjectPoleList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectPoleList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectPoleList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectPoleList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectPoleList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPoleList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectPole.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectPoleList}
 */
proto.com.navinfo.had.model.HadObjectPoleList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectPoleList;
  return proto.com.navinfo.had.model.HadObjectPoleList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectPoleList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectPoleList}
 */
proto.com.navinfo.had.model.HadObjectPoleList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectPole;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectPole.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectPoleList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectPoleList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectPoleList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPoleList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectPole.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectPole object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectPole>}
 */
proto.com.navinfo.had.model.HadObjectPoleList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectPole>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectPole, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectPole>} value */
proto.com.navinfo.had.model.HadObjectPoleList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectPole=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectPole}
 */
proto.com.navinfo.had.model.HadObjectPoleList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectPole, opt_index);
};


proto.com.navinfo.had.model.HadObjectPoleList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectPole = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectPole, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectPole.displayName = 'proto.com.navinfo.had.model.HadObjectPole';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectPole.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectPole} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPole.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    diametertop: jspb.Message.getFieldWithDefault(msg, 3, 0),
    diameterbottom: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectPole}
 */
proto.com.navinfo.had.model.HadObjectPole.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectPole;
  return proto.com.navinfo.had.model.HadObjectPole.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectPole} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectPole}
 */
proto.com.navinfo.had.model.HadObjectPole.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setDiametertop(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setDiameterbottom(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectPole.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectPole} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectPole.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getDiametertop();
  if (f !== 0) {
    writer.writeSint64(
      3,
      f
    );
  }
  f = message.getDiameterbottom();
  if (f !== 0) {
    writer.writeSint64(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectPole.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectPole.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectPole.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint64 diameterTop = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.getDiametertop = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectPole.prototype.setDiametertop = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint64 diameterBottom = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectPole.prototype.getDiameterbottom = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectPole.prototype.setDiameterbottom = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],26:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectSpeedBump', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectSpeedBumpList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectSpeedBumpList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectSpeedBumpList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectSpeedBumpList.displayName = 'proto.com.navinfo.had.model.HadObjectSpeedBumpList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectSpeedBumpList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBumpList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectSpeedBump.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectSpeedBumpList}
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectSpeedBumpList;
  return proto.com.navinfo.had.model.HadObjectSpeedBumpList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBumpList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectSpeedBumpList}
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectSpeedBump;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectSpeedBump.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectSpeedBumpList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBumpList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectSpeedBump.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectSpeedBump object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectSpeedBump>}
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectSpeedBump>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectSpeedBump, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectSpeedBump>} value */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBump=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectSpeedBump}
 */
proto.com.navinfo.had.model.HadObjectSpeedBumpList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectSpeedBump, opt_index);
};


proto.com.navinfo.had.model.HadObjectSpeedBumpList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectSpeedBump = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectSpeedBump, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectSpeedBump.displayName = 'proto.com.navinfo.had.model.HadObjectSpeedBump';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectSpeedBump.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBump} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectSpeedBump}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectSpeedBump;
  return proto.com.navinfo.had.model.HadObjectSpeedBump.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBump} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectSpeedBump}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectSpeedBump.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectSpeedBump} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectSpeedBump.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],27:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectStopLocation', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectStopLocationList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectStopLocationList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectStopLocationList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectStopLocationList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectStopLocationList.displayName = 'proto.com.navinfo.had.model.HadObjectStopLocationList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectStopLocationList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocationList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectStopLocation.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectStopLocationList}
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectStopLocationList;
  return proto.com.navinfo.had.model.HadObjectStopLocationList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocationList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectStopLocationList}
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectStopLocation;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectStopLocation.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectStopLocationList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocationList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectStopLocation.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectStopLocation object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectStopLocation>}
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectStopLocation>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectStopLocation, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectStopLocation>} value */
proto.com.navinfo.had.model.HadObjectStopLocationList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocation=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectStopLocation}
 */
proto.com.navinfo.had.model.HadObjectStopLocationList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectStopLocation, opt_index);
};


proto.com.navinfo.had.model.HadObjectStopLocationList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectStopLocation = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectStopLocation, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectStopLocation.displayName = 'proto.com.navinfo.had.model.HadObjectStopLocation';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectStopLocation.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocation} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectStopLocation.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f),
    width: jspb.Message.getFieldWithDefault(msg, 3, 0),
    color: jspb.Message.getFieldWithDefault(msg, 4, 0),
    locationtype: jspb.Message.getFieldWithDefault(msg, 5, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectStopLocation}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectStopLocation;
  return proto.com.navinfo.had.model.HadObjectStopLocation.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocation} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectStopLocation}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setWidth(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setLocationtype(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectStopLocation.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectStopLocation} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectStopLocation.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
  f = message.getWidth();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getLocationtype();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectStopLocation.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 width = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.getWidth = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.setWidth = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 color = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 locationType = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.getLocationtype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectStopLocation.prototype.setLocationtype = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],28:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectSymbol', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectSymbolList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectSymbolList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectSymbolList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectSymbolList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectSymbolList.displayName = 'proto.com.navinfo.had.model.HadObjectSymbolList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectSymbolList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectSymbolList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectSymbolList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectSymbolList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSymbolList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectSymbol.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectSymbolList}
 */
proto.com.navinfo.had.model.HadObjectSymbolList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectSymbolList;
  return proto.com.navinfo.had.model.HadObjectSymbolList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectSymbolList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectSymbolList}
 */
proto.com.navinfo.had.model.HadObjectSymbolList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectSymbol;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectSymbol.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectSymbolList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectSymbolList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectSymbolList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSymbolList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectSymbol.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectSymbol object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectSymbol>}
 */
proto.com.navinfo.had.model.HadObjectSymbolList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectSymbol>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectSymbol, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectSymbol>} value */
proto.com.navinfo.had.model.HadObjectSymbolList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectSymbol=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectSymbol}
 */
proto.com.navinfo.had.model.HadObjectSymbolList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectSymbol, opt_index);
};


proto.com.navinfo.had.model.HadObjectSymbolList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectSymbol = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectSymbol, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectSymbol.displayName = 'proto.com.navinfo.had.model.HadObjectSymbol';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectSymbol.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectSymbol} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSymbol.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    length: jspb.Message.getFieldWithDefault(msg, 3, 0),
    width: jspb.Message.getFieldWithDefault(msg, 4, 0),
    color: jspb.Message.getFieldWithDefault(msg, 5, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectSymbol}
 */
proto.com.navinfo.had.model.HadObjectSymbol.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectSymbol;
  return proto.com.navinfo.had.model.HadObjectSymbol.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectSymbol} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectSymbol}
 */
proto.com.navinfo.had.model.HadObjectSymbol.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setLength(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setWidth(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectSymbol.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectSymbol} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectSymbol.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getLength();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getWidth();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectSymbol.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 length = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.getLength = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.setLength = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 width = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.getWidth = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.setWidth = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 color = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectSymbol.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],29:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectText', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTextList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTextList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectTextList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTextList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTextList.displayName = 'proto.com.navinfo.had.model.HadObjectTextList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectTextList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTextList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTextList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTextList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTextList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectText.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTextList}
 */
proto.com.navinfo.had.model.HadObjectTextList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTextList;
  return proto.com.navinfo.had.model.HadObjectTextList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTextList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTextList}
 */
proto.com.navinfo.had.model.HadObjectTextList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectText;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectText.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTextList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTextList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTextList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTextList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectText.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectText object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectText>}
 */
proto.com.navinfo.had.model.HadObjectTextList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectText>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectText, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectText>} value */
proto.com.navinfo.had.model.HadObjectTextList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectText=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectText}
 */
proto.com.navinfo.had.model.HadObjectTextList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectText, opt_index);
};


proto.com.navinfo.had.model.HadObjectTextList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectText = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectText, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectText.displayName = 'proto.com.navinfo.had.model.HadObjectText';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectText.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectText} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectText.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    length: jspb.Message.getFieldWithDefault(msg, 3, 0),
    width: jspb.Message.getFieldWithDefault(msg, 4, 0),
    color: jspb.Message.getFieldWithDefault(msg, 5, 0),
    textstring: jspb.Message.getFieldWithDefault(msg, 6, ""),
    langcode: jspb.Message.getFieldWithDefault(msg, 7, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectText}
 */
proto.com.navinfo.had.model.HadObjectText.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectText;
  return proto.com.navinfo.had.model.HadObjectText.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectText} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectText}
 */
proto.com.navinfo.had.model.HadObjectText.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setLength(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setWidth(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    case 6:
      var value = /** @type {string} */ (reader.readString());
      msg.setTextstring(value);
      break;
    case 7:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setLangcode(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectText.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectText} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectText.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getLength();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getWidth();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
  f = message.getTextstring();
  if (f.length > 0) {
    writer.writeString(
      6,
      f
    );
  }
  f = message.getLangcode();
  if (f !== 0) {
    writer.writeSint32(
      7,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectText.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 length = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getLength = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setLength = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 width = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getWidth = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setWidth = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 color = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional string textString = 6;
 * @return {string}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getTextstring = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 6, ""));
};


/** @param {string} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setTextstring = function(value) {
  jspb.Message.setProto3StringField(this, 6, value);
};


/**
 * optional sint32 langCode = 7;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectText.prototype.getLangcode = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 7, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectText.prototype.setLangcode = function(value) {
  jspb.Message.setProto3IntField(this, 7, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],30:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTollBooth', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTollBoothList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTollBoothList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectTollBoothList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTollBoothList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTollBoothList.displayName = 'proto.com.navinfo.had.model.HadObjectTollBoothList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTollBoothList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTollBoothList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectTollBooth.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTollBoothList}
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTollBoothList;
  return proto.com.navinfo.had.model.HadObjectTollBoothList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTollBoothList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTollBoothList}
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectTollBooth;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectTollBooth.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTollBoothList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTollBoothList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectTollBooth.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectTollBooth object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectTollBooth>}
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectTollBooth>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectTollBooth, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectTollBooth>} value */
proto.com.navinfo.had.model.HadObjectTollBoothList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectTollBooth=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectTollBooth}
 */
proto.com.navinfo.had.model.HadObjectTollBoothList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectTollBooth, opt_index);
};


proto.com.navinfo.had.model.HadObjectTollBoothList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTollBooth = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTollBooth, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTollBooth.displayName = 'proto.com.navinfo.had.model.HadObjectTollBooth';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTollBooth.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTollBooth} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTollBooth.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    height: jspb.Message.getFieldWithDefault(msg, 3, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTollBooth}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTollBooth;
  return proto.com.navinfo.had.model.HadObjectTollBooth.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTollBooth} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTollBooth}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHeight(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTollBooth.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTollBooth} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTollBooth.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getHeight();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectTollBooth.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 height = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTollBooth.prototype.setHeight = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],31:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTrafficBarrier', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTrafficBarrierList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectTrafficBarrierList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTrafficBarrierList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTrafficBarrierList.displayName = 'proto.com.navinfo.had.model.HadObjectTrafficBarrierList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTrafficBarrierList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrierList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectTrafficBarrier.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficBarrierList}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTrafficBarrierList;
  return proto.com.navinfo.had.model.HadObjectTrafficBarrierList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrierList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficBarrierList}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectTrafficBarrier;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectTrafficBarrier.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTrafficBarrierList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrierList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectTrafficBarrier.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectTrafficBarrier object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectTrafficBarrier>}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectTrafficBarrier>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectTrafficBarrier, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectTrafficBarrier>} value */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrier=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficBarrier}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrierList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectTrafficBarrier, opt_index);
};


proto.com.navinfo.had.model.HadObjectTrafficBarrierList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTrafficBarrier, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTrafficBarrier.displayName = 'proto.com.navinfo.had.model.HadObjectTrafficBarrier';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTrafficBarrier.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrier} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.MultiLineString.toObject(includeInstance, f),
    side: jspb.Message.getFieldWithDefault(msg, 3, 0),
    height: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficBarrier}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTrafficBarrier;
  return proto.com.navinfo.had.model.HadObjectTrafficBarrier.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrier} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficBarrier}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.MultiLineString;
      reader.readMessage(value,geometry_pb.MultiLineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setSide(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setHeight(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTrafficBarrier.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficBarrier} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.MultiLineString.serializeBinaryToWriter
    );
  }
  f = message.getSide();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getHeight();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.MultiLineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.MultiLineString}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.MultiLineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.MultiLineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.MultiLineString|undefined} value */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 side = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.getSide = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.setSide = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 height = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.getHeight = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficBarrier.prototype.setHeight = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],32:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTrafficLights', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTrafficLightsList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectTrafficLightsList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTrafficLightsList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTrafficLightsList.displayName = 'proto.com.navinfo.had.model.HadObjectTrafficLightsList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTrafficLightsList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLightsList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectTrafficLights.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficLightsList}
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTrafficLightsList;
  return proto.com.navinfo.had.model.HadObjectTrafficLightsList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLightsList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficLightsList}
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectTrafficLights;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectTrafficLights.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTrafficLightsList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLightsList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectTrafficLights.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectTrafficLights object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectTrafficLights>}
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectTrafficLights>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectTrafficLights, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectTrafficLights>} value */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLights=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficLights}
 */
proto.com.navinfo.had.model.HadObjectTrafficLightsList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectTrafficLights, opt_index);
};


proto.com.navinfo.had.model.HadObjectTrafficLightsList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTrafficLights = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTrafficLights, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTrafficLights.displayName = 'proto.com.navinfo.had.model.HadObjectTrafficLights';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTrafficLights.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLights} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    trafficlighttype: jspb.Message.getFieldWithDefault(msg, 3, 0),
    orientation: jspb.Message.getFieldWithDefault(msg, 4, 0),
    rownumber: jspb.Message.getFieldWithDefault(msg, 5, 0),
    columnnumber: jspb.Message.getFieldWithDefault(msg, 6, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficLights}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTrafficLights;
  return proto.com.navinfo.had.model.HadObjectTrafficLights.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLights} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficLights}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setTrafficlighttype(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setOrientation(value);
      break;
    case 5:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setRownumber(value);
      break;
    case 6:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColumnnumber(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTrafficLights.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficLights} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getTrafficlighttype();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getOrientation();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
  f = message.getRownumber();
  if (f !== 0) {
    writer.writeSint32(
      5,
      f
    );
  }
  f = message.getColumnnumber();
  if (f !== 0) {
    writer.writeSint32(
      6,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 trafficLightType = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.getTrafficlighttype = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.setTrafficlighttype = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 orientation = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.getOrientation = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.setOrientation = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


/**
 * optional sint32 rowNumber = 5;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.getRownumber = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 5, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.setRownumber = function(value) {
  jspb.Message.setProto3IntField(this, 5, value);
};


/**
 * optional sint32 columnNumber = 6;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.getColumnnumber = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 6, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficLights.prototype.setColumnnumber = function(value) {
  jspb.Message.setProto3IntField(this, 6, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],33:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTrafficSign', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTrafficSignList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectTrafficSignList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTrafficSignList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTrafficSignList.displayName = 'proto.com.navinfo.had.model.HadObjectTrafficSignList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTrafficSignList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSignList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectTrafficSign.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficSignList}
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTrafficSignList;
  return proto.com.navinfo.had.model.HadObjectTrafficSignList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSignList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficSignList}
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectTrafficSign;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectTrafficSign.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTrafficSignList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSignList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectTrafficSign.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectTrafficSign object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectTrafficSign>}
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectTrafficSign>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectTrafficSign, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectTrafficSign>} value */
proto.com.navinfo.had.model.HadObjectTrafficSignList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSign=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficSign}
 */
proto.com.navinfo.had.model.HadObjectTrafficSignList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectTrafficSign, opt_index);
};


proto.com.navinfo.had.model.HadObjectTrafficSignList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTrafficSign = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTrafficSign, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTrafficSign.displayName = 'proto.com.navinfo.had.model.HadObjectTrafficSign';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTrafficSign.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSign} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    trafsignshape: jspb.Message.getFieldWithDefault(msg, 3, 0),
    color: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficSign}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTrafficSign;
  return proto.com.navinfo.had.model.HadObjectTrafficSign.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSign} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTrafficSign}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setTrafsignshape(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTrafficSign.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTrafficSign} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getTrafsignshape();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 trafsignShape = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.getTrafsignshape = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.setTrafsignshape = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 color = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTrafficSign.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],34:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTunnel', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectTunnelList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTunnelList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectTunnelList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTunnelList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTunnelList.displayName = 'proto.com.navinfo.had.model.HadObjectTunnelList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectTunnelList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTunnelList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTunnelList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTunnelList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTunnelList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectTunnel.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTunnelList}
 */
proto.com.navinfo.had.model.HadObjectTunnelList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTunnelList;
  return proto.com.navinfo.had.model.HadObjectTunnelList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTunnelList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTunnelList}
 */
proto.com.navinfo.had.model.HadObjectTunnelList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectTunnel;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectTunnel.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTunnelList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTunnelList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTunnelList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTunnelList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectTunnel.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectTunnel object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectTunnel>}
 */
proto.com.navinfo.had.model.HadObjectTunnelList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectTunnel>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectTunnel, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectTunnel>} value */
proto.com.navinfo.had.model.HadObjectTunnelList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectTunnel=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectTunnel}
 */
proto.com.navinfo.had.model.HadObjectTunnelList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectTunnel, opt_index);
};


proto.com.navinfo.had.model.HadObjectTunnelList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectTunnel = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectTunnel, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectTunnel.displayName = 'proto.com.navinfo.had.model.HadObjectTunnel';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectTunnel.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectTunnel} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTunnel.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.LineString.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectTunnel}
 */
proto.com.navinfo.had.model.HadObjectTunnel.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectTunnel;
  return proto.com.navinfo.had.model.HadObjectTunnel.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectTunnel} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectTunnel}
 */
proto.com.navinfo.had.model.HadObjectTunnel.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.LineString;
      reader.readMessage(value,geometry_pb.LineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectTunnel.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectTunnel} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectTunnel.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.LineString.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.LineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.LineString}
 */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.LineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.LineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.LineString|undefined} value */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectTunnel.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectTunnel.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],35:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectWall', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectWallList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectWallList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectWallList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectWallList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectWallList.displayName = 'proto.com.navinfo.had.model.HadObjectWallList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectWallList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectWallList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectWallList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectWallList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWallList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectWall.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectWallList}
 */
proto.com.navinfo.had.model.HadObjectWallList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectWallList;
  return proto.com.navinfo.had.model.HadObjectWallList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectWallList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectWallList}
 */
proto.com.navinfo.had.model.HadObjectWallList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectWall;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectWall.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectWallList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectWallList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectWallList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWallList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectWall.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectWall object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectWall>}
 */
proto.com.navinfo.had.model.HadObjectWallList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectWall>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectWall, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectWall>} value */
proto.com.navinfo.had.model.HadObjectWallList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectWall=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectWall}
 */
proto.com.navinfo.had.model.HadObjectWallList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectWall, opt_index);
};


proto.com.navinfo.had.model.HadObjectWallList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectWall = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectWall, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectWall.displayName = 'proto.com.navinfo.had.model.HadObjectWall';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectWall.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectWall} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWall.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.MultiLineString.toObject(includeInstance, f),
    side: jspb.Message.getFieldWithDefault(msg, 3, 0),
    type: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectWall}
 */
proto.com.navinfo.had.model.HadObjectWall.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectWall;
  return proto.com.navinfo.had.model.HadObjectWall.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectWall} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectWall}
 */
proto.com.navinfo.had.model.HadObjectWall.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.MultiLineString;
      reader.readMessage(value,geometry_pb.MultiLineString.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setSide(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setType(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectWall.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectWall} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWall.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.MultiLineString.serializeBinaryToWriter
    );
  }
  f = message.getSide();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getType();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWall.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.MultiLineString geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.MultiLineString}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.MultiLineString} */ (
    jspb.Message.getWrapperField(this, geometry_pb.MultiLineString, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.MultiLineString|undefined} value */
proto.com.navinfo.had.model.HadObjectWall.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectWall.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 side = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.getSide = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWall.prototype.setSide = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 type = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWall.prototype.getType = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWall.prototype.setType = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],36:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectWallPerpendicular', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectWallPerpendicularList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectWallPerpendicularList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectWallPerpendicularList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectWallPerpendicularList.displayName = 'proto.com.navinfo.had.model.HadObjectWallPerpendicularList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectWallPerpendicularList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicularList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectWallPerpendicular.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectWallPerpendicularList}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectWallPerpendicularList;
  return proto.com.navinfo.had.model.HadObjectWallPerpendicularList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicularList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectWallPerpendicularList}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectWallPerpendicular;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectWallPerpendicular.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectWallPerpendicularList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicularList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectWallPerpendicular.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectWallPerpendicular object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectWallPerpendicular>}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectWallPerpendicular>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectWallPerpendicular, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectWallPerpendicular>} value */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicular=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectWallPerpendicular}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicularList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectWallPerpendicular, opt_index);
};


proto.com.navinfo.had.model.HadObjectWallPerpendicularList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectWallPerpendicular, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectWallPerpendicular.displayName = 'proto.com.navinfo.had.model.HadObjectWallPerpendicular';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectWallPerpendicular.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicular} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectWallPerpendicular}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectWallPerpendicular;
  return proto.com.navinfo.had.model.HadObjectWallPerpendicular.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicular} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectWallPerpendicular}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectWallPerpendicular.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectWallPerpendicular} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectWallPerpendicular.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],37:[function(require,module,exports){
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var geometry_pb = require('./geometry_pb.js');
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectWarningArea', null, global);
goog.exportSymbol('proto.com.navinfo.had.model.HadObjectWarningAreaList', null, global);

/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.com.navinfo.had.model.HadObjectWarningAreaList.repeatedFields_, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectWarningAreaList, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectWarningAreaList.displayName = 'proto.com.navinfo.had.model.HadObjectWarningAreaList';
}
/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.repeatedFields_ = [1];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectWarningAreaList.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectWarningAreaList} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectList: jspb.Message.toObjectList(msg.getObjectList(),
    proto.com.navinfo.had.model.HadObjectWarningArea.toObject, includeInstance)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectWarningAreaList}
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectWarningAreaList;
  return proto.com.navinfo.had.model.HadObjectWarningAreaList.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectWarningAreaList} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectWarningAreaList}
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.com.navinfo.had.model.HadObjectWarningArea;
      reader.readMessage(value,proto.com.navinfo.had.model.HadObjectWarningArea.deserializeBinaryFromReader);
      msg.addObject(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectWarningAreaList.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectWarningAreaList} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.com.navinfo.had.model.HadObjectWarningArea.serializeBinaryToWriter
    );
  }
};


/**
 * repeated HadObjectWarningArea object = 1;
 * @return {!Array<!proto.com.navinfo.had.model.HadObjectWarningArea>}
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.prototype.getObjectList = function() {
  return /** @type{!Array<!proto.com.navinfo.had.model.HadObjectWarningArea>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.com.navinfo.had.model.HadObjectWarningArea, 1));
};


/** @param {!Array<!proto.com.navinfo.had.model.HadObjectWarningArea>} value */
proto.com.navinfo.had.model.HadObjectWarningAreaList.prototype.setObjectList = function(value) {
  jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.com.navinfo.had.model.HadObjectWarningArea=} opt_value
 * @param {number=} opt_index
 * @return {!proto.com.navinfo.had.model.HadObjectWarningArea}
 */
proto.com.navinfo.had.model.HadObjectWarningAreaList.prototype.addObject = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.com.navinfo.had.model.HadObjectWarningArea, opt_index);
};


proto.com.navinfo.had.model.HadObjectWarningAreaList.prototype.clearObjectList = function() {
  this.setObjectList([]);
};



/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.com.navinfo.had.model.HadObjectWarningArea = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.com.navinfo.had.model.HadObjectWarningArea, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  proto.com.navinfo.had.model.HadObjectWarningArea.displayName = 'proto.com.navinfo.had.model.HadObjectWarningArea';
}


if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto suitable for use in Soy templates.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     com.google.apps.jspb.JsClassTemplate.JS_RESERVED_WORDS.
 * @param {boolean=} opt_includeInstance Whether to include the JSPB instance
 *     for transitional soy proto support: http://goto/soy-param-migration
 * @return {!Object}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.toObject = function(opt_includeInstance) {
  return proto.com.navinfo.had.model.HadObjectWarningArea.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Whether to include the JSPB
 *     instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.com.navinfo.had.model.HadObjectWarningArea} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWarningArea.toObject = function(includeInstance, msg) {
  var f, obj = {
    objectpid: jspb.Message.getFieldWithDefault(msg, 1, 0),
    geometry: (f = msg.getGeometry()) && geometry_pb.Polygon.toObject(includeInstance, f),
    material: jspb.Message.getFieldWithDefault(msg, 3, 0),
    color: jspb.Message.getFieldWithDefault(msg, 4, 0)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.com.navinfo.had.model.HadObjectWarningArea}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.com.navinfo.had.model.HadObjectWarningArea;
  return proto.com.navinfo.had.model.HadObjectWarningArea.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.com.navinfo.had.model.HadObjectWarningArea} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.com.navinfo.had.model.HadObjectWarningArea}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {number} */ (reader.readSint64());
      msg.setObjectpid(value);
      break;
    case 2:
      var value = new geometry_pb.Polygon;
      reader.readMessage(value,geometry_pb.Polygon.deserializeBinaryFromReader);
      msg.setGeometry(value);
      break;
    case 3:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setMaterial(value);
      break;
    case 4:
      var value = /** @type {number} */ (reader.readSint32());
      msg.setColor(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.com.navinfo.had.model.HadObjectWarningArea.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.com.navinfo.had.model.HadObjectWarningArea} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.com.navinfo.had.model.HadObjectWarningArea.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getObjectpid();
  if (f !== 0) {
    writer.writeSint64(
      1,
      f
    );
  }
  f = message.getGeometry();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      geometry_pb.Polygon.serializeBinaryToWriter
    );
  }
  f = message.getMaterial();
  if (f !== 0) {
    writer.writeSint32(
      3,
      f
    );
  }
  f = message.getColor();
  if (f !== 0) {
    writer.writeSint32(
      4,
      f
    );
  }
};


/**
 * optional sint64 objectPid = 1;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.getObjectpid = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 1, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.setObjectpid = function(value) {
  jspb.Message.setProto3IntField(this, 1, value);
};


/**
 * optional geometry.Polygon geometry = 2;
 * @return {?proto.com.navinfo.had.model.geometry.Polygon}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.getGeometry = function() {
  return /** @type{?proto.com.navinfo.had.model.geometry.Polygon} */ (
    jspb.Message.getWrapperField(this, geometry_pb.Polygon, 2));
};


/** @param {?proto.com.navinfo.had.model.geometry.Polygon|undefined} value */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.setGeometry = function(value) {
  jspb.Message.setWrapperField(this, 2, value);
};


proto.com.navinfo.had.model.HadObjectWarningArea.prototype.clearGeometry = function() {
  this.setGeometry(undefined);
};


/**
 * Returns whether this field is set.
 * @return {!boolean}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.hasGeometry = function() {
  return jspb.Message.getField(this, 2) != null;
};


/**
 * optional sint32 material = 3;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.getMaterial = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 3, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.setMaterial = function(value) {
  jspb.Message.setProto3IntField(this, 3, value);
};


/**
 * optional sint32 color = 4;
 * @return {number}
 */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.getColor = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 4, 0));
};


/** @param {number} value */
proto.com.navinfo.had.model.HadObjectWarningArea.prototype.setColor = function(value) {
  jspb.Message.setProto3IntField(this, 4, value);
};


goog.object.extend(exports, proto.com.navinfo.had.model);

},{"./geometry_pb.js":5,"google-protobuf":38}],38:[function(require,module,exports){
(function (global,Buffer){
var $jscomp={scope:{},getGlobal:function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global?global:a}};$jscomp.global=$jscomp.getGlobal(this);$jscomp.initSymbol=function(){$jscomp.global.Symbol||($jscomp.global.Symbol=$jscomp.Symbol);$jscomp.initSymbol=function(){}};$jscomp.symbolCounter_=0;$jscomp.Symbol=function(a){return"jscomp_symbol_"+a+$jscomp.symbolCounter_++};
$jscomp.initSymbolIterator=function(){$jscomp.initSymbol();$jscomp.global.Symbol.iterator||($jscomp.global.Symbol.iterator=$jscomp.global.Symbol("iterator"));$jscomp.initSymbolIterator=function(){}};$jscomp.makeIterator=function(a){$jscomp.initSymbolIterator();$jscomp.initSymbol();$jscomp.initSymbolIterator();var b=a[Symbol.iterator];if(b)return b.call(a);var c=0;return{next:function(){return c<a.length?{done:!1,value:a[c++]}:{done:!0}}}};
$jscomp.arrayFromIterator=function(a){for(var b,c=[];!(b=a.next()).done;)c.push(b.value);return c};$jscomp.arrayFromIterable=function(a){return a instanceof Array?a:$jscomp.arrayFromIterator($jscomp.makeIterator(a))};$jscomp.inherits=function(a,b){function c(){}c.prototype=b.prototype;a.prototype=new c;a.prototype.constructor=a;for(var d in b)if(Object.defineProperties){var e=Object.getOwnPropertyDescriptor(b,d);e&&Object.defineProperty(a,d,e)}else a[d]=b[d]};$jscomp.array=$jscomp.array||{};
$jscomp.iteratorFromArray=function(a,b){$jscomp.initSymbolIterator();a instanceof String&&(a+="");var c=0,d={next:function(){if(c<a.length){var e=c++;return{value:b(e,a[e]),done:!1}}d.next=function(){return{done:!0,value:void 0}};return d.next()}};$jscomp.initSymbol();$jscomp.initSymbolIterator();d[Symbol.iterator]=function(){return d};return d};
$jscomp.findInternal=function(a,b,c){a instanceof String&&(a=String(a));for(var d=a.length,e=0;e<d;e++){var f=a[e];if(b.call(c,f,e,a))return{i:e,v:f}}return{i:-1,v:void 0}};
$jscomp.array.from=function(a,b,c){$jscomp.initSymbolIterator();b=null!=b?b:function(a){return a};var d=[];$jscomp.initSymbol();$jscomp.initSymbolIterator();var e=a[Symbol.iterator];"function"==typeof e&&(a=e.call(a));if("function"==typeof a.next)for(;!(e=a.next()).done;)d.push(b.call(c,e.value));else for(var e=a.length,f=0;f<e;f++)d.push(b.call(c,a[f]));return d};$jscomp.array.of=function(a){return $jscomp.array.from(arguments)};
$jscomp.array.entries=function(){return $jscomp.iteratorFromArray(this,function(a,b){return[a,b]})};$jscomp.array.installHelper_=function(a,b){!Array.prototype[a]&&Object.defineProperties&&Object.defineProperty&&Object.defineProperty(Array.prototype,a,{configurable:!0,enumerable:!1,writable:!0,value:b})};$jscomp.array.entries$install=function(){$jscomp.array.installHelper_("entries",$jscomp.array.entries)};$jscomp.array.keys=function(){return $jscomp.iteratorFromArray(this,function(a){return a})};
$jscomp.array.keys$install=function(){$jscomp.array.installHelper_("keys",$jscomp.array.keys)};$jscomp.array.values=function(){return $jscomp.iteratorFromArray(this,function(a,b){return b})};$jscomp.array.values$install=function(){$jscomp.array.installHelper_("values",$jscomp.array.values)};
$jscomp.array.copyWithin=function(a,b,c){var d=this.length;a=Number(a);b=Number(b);c=Number(null!=c?c:d);if(a<b)for(c=Math.min(c,d);b<c;)b in this?this[a++]=this[b++]:(delete this[a++],b++);else for(c=Math.min(c,d+b-a),a+=c-b;c>b;)--c in this?this[--a]=this[c]:delete this[a];return this};$jscomp.array.copyWithin$install=function(){$jscomp.array.installHelper_("copyWithin",$jscomp.array.copyWithin)};
$jscomp.array.fill=function(a,b,c){var d=this.length||0;0>b&&(b=Math.max(0,d+b));if(null==c||c>d)c=d;c=Number(c);0>c&&(c=Math.max(0,d+c));for(b=Number(b||0);b<c;b++)this[b]=a;return this};$jscomp.array.fill$install=function(){$jscomp.array.installHelper_("fill",$jscomp.array.fill)};$jscomp.array.find=function(a,b){return $jscomp.findInternal(this,a,b).v};$jscomp.array.find$install=function(){$jscomp.array.installHelper_("find",$jscomp.array.find)};
$jscomp.array.findIndex=function(a,b){return $jscomp.findInternal(this,a,b).i};$jscomp.array.findIndex$install=function(){$jscomp.array.installHelper_("findIndex",$jscomp.array.findIndex)};$jscomp.ASSUME_NO_NATIVE_MAP=!1;
$jscomp.Map$isConformant=function(){if($jscomp.ASSUME_NO_NATIVE_MAP)return!1;var a=$jscomp.global.Map;if(!a||!a.prototype.entries||"function"!=typeof Object.seal)return!1;try{var b=Object.seal({x:4}),c=new a($jscomp.makeIterator([[b,"s"]]));if("s"!=c.get(b)||1!=c.size||c.get({x:4})||c.set({x:4},"t")!=c||2!=c.size)return!1;var d=c.entries(),e=d.next();if(e.done||e.value[0]!=b||"s"!=e.value[1])return!1;e=d.next();return e.done||4!=e.value[0].x||"t"!=e.value[1]||!d.next().done?!1:!0}catch(f){return!1}};
$jscomp.Map=function(a){this.data_={};this.head_=$jscomp.Map.createHead();this.size=0;if(a){a=$jscomp.makeIterator(a);for(var b;!(b=a.next()).done;)b=b.value,this.set(b[0],b[1])}};
$jscomp.Map.prototype.set=function(a,b){var c=$jscomp.Map.maybeGetEntry(this,a);c.list||(c.list=this.data_[c.id]=[]);c.entry?c.entry.value=b:(c.entry={next:this.head_,previous:this.head_.previous,head:this.head_,key:a,value:b},c.list.push(c.entry),this.head_.previous.next=c.entry,this.head_.previous=c.entry,this.size++);return this};
$jscomp.Map.prototype["delete"]=function(a){a=$jscomp.Map.maybeGetEntry(this,a);return a.entry&&a.list?(a.list.splice(a.index,1),a.list.length||delete this.data_[a.id],a.entry.previous.next=a.entry.next,a.entry.next.previous=a.entry.previous,a.entry.head=null,this.size--,!0):!1};$jscomp.Map.prototype.clear=function(){this.data_={};this.head_=this.head_.previous=$jscomp.Map.createHead();this.size=0};$jscomp.Map.prototype.has=function(a){return!!$jscomp.Map.maybeGetEntry(this,a).entry};
$jscomp.Map.prototype.get=function(a){return(a=$jscomp.Map.maybeGetEntry(this,a).entry)&&a.value};$jscomp.Map.prototype.entries=function(){return $jscomp.Map.makeIterator_(this,function(a){return[a.key,a.value]})};$jscomp.Map.prototype.keys=function(){return $jscomp.Map.makeIterator_(this,function(a){return a.key})};$jscomp.Map.prototype.values=function(){return $jscomp.Map.makeIterator_(this,function(a){return a.value})};
$jscomp.Map.prototype.forEach=function(a,b){for(var c=this.entries(),d;!(d=c.next()).done;)d=d.value,a.call(b,d[1],d[0],this)};$jscomp.Map.maybeGetEntry=function(a,b){var c=$jscomp.Map.getId(b),d=a.data_[c];if(d&&Object.prototype.hasOwnProperty.call(a.data_,c))for(var e=0;e<d.length;e++){var f=d[e];if(b!==b&&f.key!==f.key||b===f.key)return{id:c,list:d,index:e,entry:f}}return{id:c,list:d,index:-1,entry:void 0}};
$jscomp.Map.makeIterator_=function(a,b){var c=a.head_,d={next:function(){if(c){for(;c.head!=a.head_;)c=c.previous;for(;c.next!=c.head;)return c=c.next,{done:!1,value:b(c)};c=null}return{done:!0,value:void 0}}};$jscomp.initSymbol();$jscomp.initSymbolIterator();d[Symbol.iterator]=function(){return d};return d};$jscomp.Map.mapIndex_=0;$jscomp.Map.createHead=function(){var a={};return a.previous=a.next=a.head=a};
$jscomp.Map.getId=function(a){if(!(a instanceof Object))return"p_"+a;if(!($jscomp.Map.idKey in a))try{$jscomp.Map.defineProperty(a,$jscomp.Map.idKey,{value:++$jscomp.Map.mapIndex_})}catch(b){}return $jscomp.Map.idKey in a?a[$jscomp.Map.idKey]:"o_ "+a};$jscomp.Map.defineProperty=Object.defineProperty?function(a,b,c){Object.defineProperty(a,b,{value:String(c)})}:function(a,b,c){a[b]=String(c)};$jscomp.Map.Entry=function(){};
$jscomp.Map$install=function(){$jscomp.initSymbol();$jscomp.initSymbolIterator();$jscomp.Map$isConformant()?$jscomp.Map=$jscomp.global.Map:($jscomp.initSymbol(),$jscomp.initSymbolIterator(),$jscomp.Map.prototype[Symbol.iterator]=$jscomp.Map.prototype.entries,$jscomp.initSymbol(),$jscomp.Map.idKey=Symbol("map-id-key"),$jscomp.Map$install=function(){})};$jscomp.math=$jscomp.math||{};
$jscomp.math.clz32=function(a){a=Number(a)>>>0;if(0===a)return 32;var b=0;0===(a&4294901760)&&(a<<=16,b+=16);0===(a&4278190080)&&(a<<=8,b+=8);0===(a&4026531840)&&(a<<=4,b+=4);0===(a&3221225472)&&(a<<=2,b+=2);0===(a&2147483648)&&b++;return b};$jscomp.math.imul=function(a,b){a=Number(a);b=Number(b);var c=a&65535,d=b&65535;return c*d+((a>>>16&65535)*d+c*(b>>>16&65535)<<16>>>0)|0};$jscomp.math.sign=function(a){a=Number(a);return 0===a||isNaN(a)?a:0<a?1:-1};
$jscomp.math.log10=function(a){return Math.log(a)/Math.LN10};$jscomp.math.log2=function(a){return Math.log(a)/Math.LN2};$jscomp.math.log1p=function(a){a=Number(a);if(.25>a&&-.25<a){for(var b=a,c=1,d=a,e=0,f=1;e!=d;)b*=a,f*=-1,d=(e=d)+f*b/++c;return d}return Math.log(1+a)};$jscomp.math.expm1=function(a){a=Number(a);if(.25>a&&-.25<a){for(var b=a,c=1,d=a,e=0;e!=d;)b*=a/++c,d=(e=d)+b;return d}return Math.exp(a)-1};$jscomp.math.cosh=function(a){a=Number(a);return(Math.exp(a)+Math.exp(-a))/2};
$jscomp.math.sinh=function(a){a=Number(a);return 0===a?a:(Math.exp(a)-Math.exp(-a))/2};$jscomp.math.tanh=function(a){a=Number(a);if(0===a)return a;var b=Math.exp(-2*Math.abs(a)),b=(1-b)/(1+b);return 0>a?-b:b};$jscomp.math.acosh=function(a){a=Number(a);return Math.log(a+Math.sqrt(a*a-1))};$jscomp.math.asinh=function(a){a=Number(a);if(0===a)return a;var b=Math.log(Math.abs(a)+Math.sqrt(a*a+1));return 0>a?-b:b};
$jscomp.math.atanh=function(a){a=Number(a);return($jscomp.math.log1p(a)-$jscomp.math.log1p(-a))/2};$jscomp.math.hypot=function(a,b,c){a=Number(a);b=Number(b);var d,e,f,g=Math.max(Math.abs(a),Math.abs(b));for(d=2;d<arguments.length;d++)g=Math.max(g,Math.abs(arguments[d]));if(1E100<g||1E-100>g){a/=g;b/=g;f=a*a+b*b;for(d=2;d<arguments.length;d++)e=Number(arguments[d])/g,f+=e*e;return Math.sqrt(f)*g}f=a*a+b*b;for(d=2;d<arguments.length;d++)e=Number(arguments[d]),f+=e*e;return Math.sqrt(f)};
$jscomp.math.trunc=function(a){a=Number(a);if(isNaN(a)||Infinity===a||-Infinity===a||0===a)return a;var b=Math.floor(Math.abs(a));return 0>a?-b:b};$jscomp.math.cbrt=function(a){if(0===a)return a;a=Number(a);var b=Math.pow(Math.abs(a),1/3);return 0>a?-b:b};$jscomp.number=$jscomp.number||{};$jscomp.number.isFinite=function(a){return"number"!==typeof a?!1:!isNaN(a)&&Infinity!==a&&-Infinity!==a};$jscomp.number.isInteger=function(a){return $jscomp.number.isFinite(a)?a===Math.floor(a):!1};
$jscomp.number.isNaN=function(a){return"number"===typeof a&&isNaN(a)};$jscomp.number.isSafeInteger=function(a){return $jscomp.number.isInteger(a)&&Math.abs(a)<=$jscomp.number.MAX_SAFE_INTEGER};$jscomp.number.EPSILON=function(){return Math.pow(2,-52)}();$jscomp.number.MAX_SAFE_INTEGER=function(){return 9007199254740991}();$jscomp.number.MIN_SAFE_INTEGER=function(){return-9007199254740991}();$jscomp.object=$jscomp.object||{};
$jscomp.object.assign=function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c];if(d)for(var e in d)Object.prototype.hasOwnProperty.call(d,e)&&(a[e]=d[e])}return a};$jscomp.object.is=function(a,b){return a===b?0!==a||1/a===1/b:a!==a&&b!==b};$jscomp.ASSUME_NO_NATIVE_SET=!1;
$jscomp.Set$isConformant=function(){if($jscomp.ASSUME_NO_NATIVE_SET)return!1;var a=$jscomp.global.Set;if(!a||!a.prototype.entries||"function"!=typeof Object.seal)return!1;try{var b=Object.seal({x:4}),c=new a($jscomp.makeIterator([b]));if(!c.has(b)||1!=c.size||c.add(b)!=c||1!=c.size||c.add({x:4})!=c||2!=c.size)return!1;var d=c.entries(),e=d.next();if(e.done||e.value[0]!=b||e.value[1]!=b)return!1;e=d.next();return e.done||e.value[0]==b||4!=e.value[0].x||e.value[1]!=e.value[0]?!1:d.next().done}catch(f){return!1}};
$jscomp.Set=function(a){this.map_=new $jscomp.Map;if(a){a=$jscomp.makeIterator(a);for(var b;!(b=a.next()).done;)this.add(b.value)}this.size=this.map_.size};$jscomp.Set.prototype.add=function(a){this.map_.set(a,a);this.size=this.map_.size;return this};$jscomp.Set.prototype["delete"]=function(a){a=this.map_["delete"](a);this.size=this.map_.size;return a};$jscomp.Set.prototype.clear=function(){this.map_.clear();this.size=0};$jscomp.Set.prototype.has=function(a){return this.map_.has(a)};
$jscomp.Set.prototype.entries=function(){return this.map_.entries()};$jscomp.Set.prototype.values=function(){return this.map_.values()};$jscomp.Set.prototype.forEach=function(a,b){var c=this;this.map_.forEach(function(d){return a.call(b,d,d,c)})};$jscomp.Set$install=function(){$jscomp.Map$install();$jscomp.Set$isConformant()?$jscomp.Set=$jscomp.global.Set:($jscomp.initSymbol(),$jscomp.initSymbolIterator(),$jscomp.Set.prototype[Symbol.iterator]=$jscomp.Set.prototype.values,$jscomp.Set$install=function(){})};
$jscomp.string=$jscomp.string||{};$jscomp.checkStringArgs=function(a,b,c){if(null==a)throw new TypeError("The 'this' value for String.prototype."+c+" must not be null or undefined");if(b instanceof RegExp)throw new TypeError("First argument to String.prototype."+c+" must not be a regular expression");return a+""};
$jscomp.string.fromCodePoint=function(a){for(var b="",c=0;c<arguments.length;c++){var d=Number(arguments[c]);if(0>d||1114111<d||d!==Math.floor(d))throw new RangeError("invalid_code_point "+d);65535>=d?b+=String.fromCharCode(d):(d-=65536,b+=String.fromCharCode(d>>>10&1023|55296),b+=String.fromCharCode(d&1023|56320))}return b};
$jscomp.string.repeat=function(a){var b=$jscomp.checkStringArgs(this,null,"repeat");if(0>a||1342177279<a)throw new RangeError("Invalid count value");a|=0;for(var c="";a;)if(a&1&&(c+=b),a>>>=1)b+=b;return c};$jscomp.string.repeat$install=function(){String.prototype.repeat||(String.prototype.repeat=$jscomp.string.repeat)};
$jscomp.string.codePointAt=function(a){var b=$jscomp.checkStringArgs(this,null,"codePointAt"),c=b.length;a=Number(a)||0;if(0<=a&&a<c){a|=0;var d=b.charCodeAt(a);if(55296>d||56319<d||a+1===c)return d;a=b.charCodeAt(a+1);return 56320>a||57343<a?d:1024*(d-55296)+a+9216}};$jscomp.string.codePointAt$install=function(){String.prototype.codePointAt||(String.prototype.codePointAt=$jscomp.string.codePointAt)};
$jscomp.string.includes=function(a,b){return-1!==$jscomp.checkStringArgs(this,a,"includes").indexOf(a,b||0)};$jscomp.string.includes$install=function(){String.prototype.includes||(String.prototype.includes=$jscomp.string.includes)};$jscomp.string.startsWith=function(a,b){var c=$jscomp.checkStringArgs(this,a,"startsWith");a+="";for(var d=c.length,e=a.length,f=Math.max(0,Math.min(b|0,c.length)),g=0;g<e&&f<d;)if(c[f++]!=a[g++])return!1;return g>=e};
$jscomp.string.startsWith$install=function(){String.prototype.startsWith||(String.prototype.startsWith=$jscomp.string.startsWith)};$jscomp.string.endsWith=function(a,b){var c=$jscomp.checkStringArgs(this,a,"endsWith");a+="";void 0===b&&(b=c.length);for(var d=Math.max(0,Math.min(b|0,c.length)),e=a.length;0<e&&0<d;)if(c[--d]!=a[--e])return!1;return 0>=e};$jscomp.string.endsWith$install=function(){String.prototype.endsWith||(String.prototype.endsWith=$jscomp.string.endsWith)};
var COMPILED=!0,goog=goog||{};goog.global=this;goog.isDef=function(a){return void 0!==a};goog.exportPath_=function(a,b,c){a=a.split(".");c=c||goog.global;a[0]in c||!c.execScript||c.execScript("var "+a[0]);for(var d;a.length&&(d=a.shift());)!a.length&&goog.isDef(b)?c[d]=b:c=c[d]?c[d]:c[d]={}};
goog.define=function(a,b){var c=b;COMPILED||(goog.global.CLOSURE_UNCOMPILED_DEFINES&&Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_UNCOMPILED_DEFINES,a)?c=goog.global.CLOSURE_UNCOMPILED_DEFINES[a]:goog.global.CLOSURE_DEFINES&&Object.prototype.hasOwnProperty.call(goog.global.CLOSURE_DEFINES,a)&&(c=goog.global.CLOSURE_DEFINES[a]));goog.exportPath_(a,c)};goog.DEBUG=!0;goog.LOCALE="en";goog.TRUSTED_SITE=!0;goog.STRICT_MODE_COMPATIBLE=!1;goog.DISALLOW_TEST_ONLY_CODE=COMPILED&&!goog.DEBUG;
goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING=!1;goog.provide=function(a){if(!COMPILED&&goog.isProvided_(a))throw Error('Namespace "'+a+'" already declared.');goog.constructNamespace_(a)};goog.constructNamespace_=function(a,b){if(!COMPILED){delete goog.implicitNamespaces_[a];for(var c=a;(c=c.substring(0,c.lastIndexOf(".")))&&!goog.getObjectByName(c);)goog.implicitNamespaces_[c]=!0}goog.exportPath_(a,b)};goog.VALID_MODULE_RE_=/^[a-zA-Z_$][a-zA-Z0-9._$]*$/;
goog.module=function(a){if(!goog.isString(a)||!a||-1==a.search(goog.VALID_MODULE_RE_))throw Error("Invalid module identifier");if(!goog.isInModuleLoader_())throw Error("Module "+a+" has been loaded incorrectly.");if(goog.moduleLoaderState_.moduleName)throw Error("goog.module may only be called once per module.");goog.moduleLoaderState_.moduleName=a;if(!COMPILED){if(goog.isProvided_(a))throw Error('Namespace "'+a+'" already declared.');delete goog.implicitNamespaces_[a]}};goog.module.get=function(a){return goog.module.getInternal_(a)};
goog.module.getInternal_=function(a){if(!COMPILED)return goog.isProvided_(a)?a in goog.loadedModules_?goog.loadedModules_[a]:goog.getObjectByName(a):null};goog.moduleLoaderState_=null;goog.isInModuleLoader_=function(){return null!=goog.moduleLoaderState_};
goog.module.declareLegacyNamespace=function(){if(!COMPILED&&!goog.isInModuleLoader_())throw Error("goog.module.declareLegacyNamespace must be called from within a goog.module");if(!COMPILED&&!goog.moduleLoaderState_.moduleName)throw Error("goog.module must be called prior to goog.module.declareLegacyNamespace.");goog.moduleLoaderState_.declareLegacyNamespace=!0};
goog.setTestOnly=function(a){if(goog.DISALLOW_TEST_ONLY_CODE)throw a=a||"",Error("Importing test-only code into non-debug environment"+(a?": "+a:"."));};goog.forwardDeclare=function(a){};COMPILED||(goog.isProvided_=function(a){return a in goog.loadedModules_||!goog.implicitNamespaces_[a]&&goog.isDefAndNotNull(goog.getObjectByName(a))},goog.implicitNamespaces_={"goog.module":!0});
goog.getObjectByName=function(a,b){for(var c=a.split("."),d=b||goog.global,e;e=c.shift();)if(goog.isDefAndNotNull(d[e]))d=d[e];else return null;return d};goog.globalize=function(a,b){var c=b||goog.global,d;for(d in a)c[d]=a[d]};goog.addDependency=function(a,b,c,d){if(goog.DEPENDENCIES_ENABLED){var e;a=a.replace(/\\/g,"/");for(var f=goog.dependencies_,g=0;e=b[g];g++)f.nameToPath[e]=a,f.pathIsModule[a]=!!d;for(d=0;b=c[d];d++)a in f.requires||(f.requires[a]={}),f.requires[a][b]=!0}};
goog.ENABLE_DEBUG_LOADER=!0;goog.logToConsole_=function(a){goog.global.console&&goog.global.console.error(a)};goog.require=function(a){if(!COMPILED){goog.ENABLE_DEBUG_LOADER&&goog.IS_OLD_IE_&&goog.maybeProcessDeferredDep_(a);if(goog.isProvided_(a))return goog.isInModuleLoader_()?goog.module.getInternal_(a):null;if(goog.ENABLE_DEBUG_LOADER){var b=goog.getPathFromDeps_(a);if(b)return goog.writeScripts_(b),null}a="goog.require could not find: "+a;goog.logToConsole_(a);throw Error(a);}};
goog.basePath="";goog.nullFunction=function(){};goog.abstractMethod=function(){throw Error("unimplemented abstract method");};goog.addSingletonGetter=function(a){a.getInstance=function(){if(a.instance_)return a.instance_;goog.DEBUG&&(goog.instantiatedSingletons_[goog.instantiatedSingletons_.length]=a);return a.instance_=new a}};goog.instantiatedSingletons_=[];goog.LOAD_MODULE_USING_EVAL=!0;goog.SEAL_MODULE_EXPORTS=goog.DEBUG;goog.loadedModules_={};goog.DEPENDENCIES_ENABLED=!COMPILED&&goog.ENABLE_DEBUG_LOADER;
goog.DEPENDENCIES_ENABLED&&(goog.dependencies_={pathIsModule:{},nameToPath:{},requires:{},visited:{},written:{},deferred:{}},goog.inHtmlDocument_=function(){var a=goog.global.document;return null!=a&&"write"in a},goog.findBasePath_=function(){if(goog.isDef(goog.global.CLOSURE_BASE_PATH))goog.basePath=goog.global.CLOSURE_BASE_PATH;else if(goog.inHtmlDocument_())for(var a=goog.global.document.getElementsByTagName("SCRIPT"),b=a.length-1;0<=b;--b){var c=a[b].src,d=c.lastIndexOf("?"),d=-1==d?c.length:
d;if("base.js"==c.substr(d-7,7)){goog.basePath=c.substr(0,d-7);break}}},goog.importScript_=function(a,b){(goog.global.CLOSURE_IMPORT_SCRIPT||goog.writeScriptTag_)(a,b)&&(goog.dependencies_.written[a]=!0)},goog.IS_OLD_IE_=!(goog.global.atob||!goog.global.document||!goog.global.document.all),goog.importModule_=function(a){goog.importScript_("",'goog.retrieveAndExecModule_("'+a+'");')&&(goog.dependencies_.written[a]=!0)},goog.queuedModules_=[],goog.wrapModule_=function(a,b){return goog.LOAD_MODULE_USING_EVAL&&
goog.isDef(goog.global.JSON)?"goog.loadModule("+goog.global.JSON.stringify(b+"\n//# sourceURL="+a+"\n")+");":'goog.loadModule(function(exports) {"use strict";'+b+"\n;return exports});\n//# sourceURL="+a+"\n"},goog.loadQueuedModules_=function(){var a=goog.queuedModules_.length;if(0<a){var b=goog.queuedModules_;goog.queuedModules_=[];for(var c=0;c<a;c++)goog.maybeProcessDeferredPath_(b[c])}},goog.maybeProcessDeferredDep_=function(a){goog.isDeferredModule_(a)&&goog.allDepsAreAvailable_(a)&&(a=goog.getPathFromDeps_(a),
goog.maybeProcessDeferredPath_(goog.basePath+a))},goog.isDeferredModule_=function(a){return(a=goog.getPathFromDeps_(a))&&goog.dependencies_.pathIsModule[a]?goog.basePath+a in goog.dependencies_.deferred:!1},goog.allDepsAreAvailable_=function(a){if((a=goog.getPathFromDeps_(a))&&a in goog.dependencies_.requires)for(var b in goog.dependencies_.requires[a])if(!goog.isProvided_(b)&&!goog.isDeferredModule_(b))return!1;return!0},goog.maybeProcessDeferredPath_=function(a){if(a in goog.dependencies_.deferred){var b=
goog.dependencies_.deferred[a];delete goog.dependencies_.deferred[a];goog.globalEval(b)}},goog.loadModuleFromUrl=function(a){goog.retrieveAndExecModule_(a)},goog.loadModule=function(a){var b=goog.moduleLoaderState_;try{goog.moduleLoaderState_={moduleName:void 0,declareLegacyNamespace:!1};var c;if(goog.isFunction(a))c=a.call(goog.global,{});else if(goog.isString(a))c=goog.loadModuleFromSource_.call(goog.global,a);else throw Error("Invalid module definition");var d=goog.moduleLoaderState_.moduleName;
if(!goog.isString(d)||!d)throw Error('Invalid module name "'+d+'"');goog.moduleLoaderState_.declareLegacyNamespace?goog.constructNamespace_(d,c):goog.SEAL_MODULE_EXPORTS&&Object.seal&&Object.seal(c);goog.loadedModules_[d]=c}finally{goog.moduleLoaderState_=b}},goog.loadModuleFromSource_=function(a){eval(a);return{}},goog.writeScriptSrcNode_=function(a){goog.global.document.write('<script type="text/javascript" src="'+a+'">\x3c/script>')},goog.appendScriptSrcNode_=function(a){var b=goog.global.document,
c=b.createElement("script");c.type="text/javascript";c.src=a;c.defer=!1;c.async=!1;b.head.appendChild(c)},goog.writeScriptTag_=function(a,b){if(goog.inHtmlDocument_()){var c=goog.global.document;if(!goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING&&"complete"==c.readyState){if(/\bdeps.js$/.test(a))return!1;throw Error('Cannot write "'+a+'" after document load');}var d=goog.IS_OLD_IE_;void 0===b?d?(d=" onreadystatechange='goog.onScriptLoad_(this, "+ ++goog.lastNonModuleScriptIndex_+")' ",c.write('<script type="text/javascript" src="'+
a+'"'+d+">\x3c/script>")):goog.ENABLE_CHROME_APP_SAFE_SCRIPT_LOADING?goog.appendScriptSrcNode_(a):goog.writeScriptSrcNode_(a):c.write('<script type="text/javascript">'+b+"\x3c/script>");return!0}return!1},goog.lastNonModuleScriptIndex_=0,goog.onScriptLoad_=function(a,b){"complete"==a.readyState&&goog.lastNonModuleScriptIndex_==b&&goog.loadQueuedModules_();return!0},goog.writeScripts_=function(a){function b(a){if(!(a in e.written||a in e.visited)){e.visited[a]=!0;if(a in e.requires)for(var f in e.requires[a])if(!goog.isProvided_(f))if(f in
e.nameToPath)b(e.nameToPath[f]);else throw Error("Undefined nameToPath for "+f);a in d||(d[a]=!0,c.push(a))}}var c=[],d={},e=goog.dependencies_;b(a);for(a=0;a<c.length;a++){var f=c[a];goog.dependencies_.written[f]=!0}var g=goog.moduleLoaderState_;goog.moduleLoaderState_=null;for(a=0;a<c.length;a++)if(f=c[a])e.pathIsModule[f]?goog.importModule_(goog.basePath+f):goog.importScript_(goog.basePath+f);else throw goog.moduleLoaderState_=g,Error("Undefined script input");goog.moduleLoaderState_=g},goog.getPathFromDeps_=
function(a){return a in goog.dependencies_.nameToPath?goog.dependencies_.nameToPath[a]:null},goog.findBasePath_(),goog.global.CLOSURE_NO_DEPS||goog.importScript_(goog.basePath+"deps.js"));goog.normalizePath_=function(a){a=a.split("/");for(var b=0;b<a.length;)"."==a[b]?a.splice(b,1):b&&".."==a[b]&&a[b-1]&&".."!=a[b-1]?a.splice(--b,2):b++;return a.join("/")};
goog.loadFileSync_=function(a){if(goog.global.CLOSURE_LOAD_FILE_SYNC)return goog.global.CLOSURE_LOAD_FILE_SYNC(a);var b=new goog.global.XMLHttpRequest;b.open("get",a,!1);b.send();return b.responseText};
goog.retrieveAndExecModule_=function(a){if(!COMPILED){var b=a;a=goog.normalizePath_(a);var c=goog.global.CLOSURE_IMPORT_SCRIPT||goog.writeScriptTag_,d=goog.loadFileSync_(a);if(null!=d)d=goog.wrapModule_(a,d),goog.IS_OLD_IE_?(goog.dependencies_.deferred[b]=d,goog.queuedModules_.push(b)):c(a,d);else throw Error("load of "+a+"failed");}};
goog.typeOf=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b};goog.isNull=function(a){return null===a};goog.isDefAndNotNull=function(a){return null!=a};goog.isArray=function(a){return"array"==goog.typeOf(a)};goog.isArrayLike=function(a){var b=goog.typeOf(a);return"array"==b||"object"==b&&"number"==typeof a.length};goog.isDateLike=function(a){return goog.isObject(a)&&"function"==typeof a.getFullYear};goog.isString=function(a){return"string"==typeof a};
goog.isBoolean=function(a){return"boolean"==typeof a};goog.isNumber=function(a){return"number"==typeof a};goog.isFunction=function(a){return"function"==goog.typeOf(a)};goog.isObject=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b};goog.getUid=function(a){return a[goog.UID_PROPERTY_]||(a[goog.UID_PROPERTY_]=++goog.uidCounter_)};goog.hasUid=function(a){return!!a[goog.UID_PROPERTY_]};
goog.removeUid=function(a){null!==a&&"removeAttribute"in a&&a.removeAttribute(goog.UID_PROPERTY_);try{delete a[goog.UID_PROPERTY_]}catch(b){}};goog.UID_PROPERTY_="closure_uid_"+(1E9*Math.random()>>>0);goog.uidCounter_=0;goog.getHashCode=goog.getUid;goog.removeHashCode=goog.removeUid;goog.cloneObject=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(a.clone)return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.cloneObject(a[c]);return b}return a};
goog.bindNative_=function(a,b,c){return a.call.apply(a.bind,arguments)};goog.bindJs_=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}};
goog.bind=function(a,b,c){Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?goog.bind=goog.bindNative_:goog.bind=goog.bindJs_;return goog.bind.apply(null,arguments)};goog.partial=function(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=c.slice();b.push.apply(b,arguments);return a.apply(this,b)}};goog.mixin=function(a,b){for(var c in b)a[c]=b[c]};goog.now=goog.TRUSTED_SITE&&Date.now||function(){return+new Date};
goog.globalEval=function(a){if(goog.global.execScript)goog.global.execScript(a,"JavaScript");else if(goog.global.eval){if(null==goog.evalWorksForGlobals_)if(goog.global.eval("var _evalTest_ = 1;"),"undefined"!=typeof goog.global._evalTest_){try{delete goog.global._evalTest_}catch(d){}goog.evalWorksForGlobals_=!0}else goog.evalWorksForGlobals_=!1;if(goog.evalWorksForGlobals_)goog.global.eval(a);else{var b=goog.global.document,c=b.createElement("SCRIPT");c.type="text/javascript";c.defer=!1;c.appendChild(b.createTextNode(a));
b.body.appendChild(c);b.body.removeChild(c)}}else throw Error("goog.globalEval not available");};goog.evalWorksForGlobals_=null;goog.getCssName=function(a,b){var c=function(a){return goog.cssNameMapping_[a]||a},d=function(a){a=a.split("-");for(var b=[],d=0;d<a.length;d++)b.push(c(a[d]));return b.join("-")},d=goog.cssNameMapping_?"BY_WHOLE"==goog.cssNameMappingStyle_?c:d:function(a){return a};return b?a+"-"+d(b):d(a)};
goog.setCssNameMapping=function(a,b){goog.cssNameMapping_=a;goog.cssNameMappingStyle_=b};!COMPILED&&goog.global.CLOSURE_CSS_NAME_MAPPING&&(goog.cssNameMapping_=goog.global.CLOSURE_CSS_NAME_MAPPING);goog.getMsg=function(a,b){b&&(a=a.replace(/\{\$([^}]+)}/g,function(a,d){return null!=b&&d in b?b[d]:a}));return a};goog.getMsgWithFallback=function(a,b){return a};goog.exportSymbol=function(a,b,c){goog.exportPath_(a,b,c)};goog.exportProperty=function(a,b,c){a[b]=c};
goog.inherits=function(a,b){function c(){}c.prototype=b.prototype;a.superClass_=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.base=function(a,c,f){for(var g=Array(arguments.length-2),h=2;h<arguments.length;h++)g[h-2]=arguments[h];return b.prototype[c].apply(a,g)}};
goog.base=function(a,b,c){var d=arguments.callee.caller;if(goog.STRICT_MODE_COMPATIBLE||goog.DEBUG&&!d)throw Error("arguments.caller not defined.  goog.base() cannot be used with strict mode code. See http://www.ecma-international.org/ecma-262/5.1/#sec-C");if(d.superClass_){for(var e=Array(arguments.length-1),f=1;f<arguments.length;f++)e[f-1]=arguments[f];return d.superClass_.constructor.apply(a,e)}e=Array(arguments.length-2);for(f=2;f<arguments.length;f++)e[f-2]=arguments[f];for(var f=!1,g=a.constructor;g;g=
g.superClass_&&g.superClass_.constructor)if(g.prototype[b]===d)f=!0;else if(f)return g.prototype[b].apply(a,e);if(a[b]===d)return a.constructor.prototype[b].apply(a,e);throw Error("goog.base called from a method of one name to a method of a different name");};goog.scope=function(a){a.call(goog.global)};COMPILED||(goog.global.COMPILED=COMPILED);
goog.defineClass=function(a,b){var c=b.constructor,d=b.statics;c&&c!=Object.prototype.constructor||(c=function(){throw Error("cannot instantiate an interface (no constructor defined).");});c=goog.defineClass.createSealingConstructor_(c,a);a&&goog.inherits(c,a);delete b.constructor;delete b.statics;goog.defineClass.applyProperties_(c.prototype,b);null!=d&&(d instanceof Function?d(c):goog.defineClass.applyProperties_(c,d));return c};goog.defineClass.SEAL_CLASS_INSTANCES=goog.DEBUG;
goog.defineClass.createSealingConstructor_=function(a,b){if(goog.defineClass.SEAL_CLASS_INSTANCES&&Object.seal instanceof Function){if(b&&b.prototype&&b.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_])return a;var c=function(){var b=a.apply(this,arguments)||this;b[goog.UID_PROPERTY_]=b[goog.UID_PROPERTY_];this.constructor===c&&Object.seal(b);return b};return c}return a};goog.defineClass.OBJECT_PROTOTYPE_FIELDS_="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.defineClass.applyProperties_=function(a,b){for(var c in b)Object.prototype.hasOwnProperty.call(b,c)&&(a[c]=b[c]);for(var d=0;d<goog.defineClass.OBJECT_PROTOTYPE_FIELDS_.length;d++)c=goog.defineClass.OBJECT_PROTOTYPE_FIELDS_[d],Object.prototype.hasOwnProperty.call(b,c)&&(a[c]=b[c])};goog.tagUnsealableClass=function(a){!COMPILED&&goog.defineClass.SEAL_CLASS_INSTANCES&&(a.prototype[goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_]=!0)};goog.UNSEALABLE_CONSTRUCTOR_PROPERTY_="goog_defineClass_legacy_unsealable";goog.dom={};goog.dom.NodeType={ELEMENT:1,ATTRIBUTE:2,TEXT:3,CDATA_SECTION:4,ENTITY_REFERENCE:5,ENTITY:6,PROCESSING_INSTRUCTION:7,COMMENT:8,DOCUMENT:9,DOCUMENT_TYPE:10,DOCUMENT_FRAGMENT:11,NOTATION:12};goog.debug={};goog.debug.Error=function(a){if(Error.captureStackTrace)Error.captureStackTrace(this,goog.debug.Error);else{var b=Error().stack;b&&(this.stack=b)}a&&(this.message=String(a));this.reportErrorToServer=!0};goog.inherits(goog.debug.Error,Error);goog.debug.Error.prototype.name="CustomError";goog.string={};goog.string.DETECT_DOUBLE_ESCAPING=!1;goog.string.FORCE_NON_DOM_HTML_UNESCAPING=!1;goog.string.Unicode={NBSP:"\u00a0"};goog.string.startsWith=function(a,b){return 0==a.lastIndexOf(b,0)};goog.string.endsWith=function(a,b){var c=a.length-b.length;return 0<=c&&a.indexOf(b,c)==c};goog.string.caseInsensitiveStartsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(0,b.length))};
goog.string.caseInsensitiveEndsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(a.length-b.length,b.length))};goog.string.caseInsensitiveEquals=function(a,b){return a.toLowerCase()==b.toLowerCase()};goog.string.subs=function(a,b){for(var c=a.split("%s"),d="",e=Array.prototype.slice.call(arguments,1);e.length&&1<c.length;)d+=c.shift()+e.shift();return d+c.join("%s")};goog.string.collapseWhitespace=function(a){return a.replace(/[\s\xa0]+/g," ").replace(/^\s+|\s+$/g,"")};
goog.string.isEmptyOrWhitespace=function(a){return/^[\s\xa0]*$/.test(a)};goog.string.isEmptyString=function(a){return 0==a.length};goog.string.isEmpty=goog.string.isEmptyOrWhitespace;goog.string.isEmptyOrWhitespaceSafe=function(a){return goog.string.isEmptyOrWhitespace(goog.string.makeSafe(a))};goog.string.isEmptySafe=goog.string.isEmptyOrWhitespaceSafe;goog.string.isBreakingWhitespace=function(a){return!/[^\t\n\r ]/.test(a)};goog.string.isAlpha=function(a){return!/[^a-zA-Z]/.test(a)};
goog.string.isNumeric=function(a){return!/[^0-9]/.test(a)};goog.string.isAlphaNumeric=function(a){return!/[^a-zA-Z0-9]/.test(a)};goog.string.isSpace=function(a){return" "==a};goog.string.isUnicodeChar=function(a){return 1==a.length&&" "<=a&&"~">=a||"\u0080"<=a&&"\ufffd">=a};goog.string.stripNewlines=function(a){return a.replace(/(\r\n|\r|\n)+/g," ")};goog.string.canonicalizeNewlines=function(a){return a.replace(/(\r\n|\r|\n)/g,"\n")};
goog.string.normalizeWhitespace=function(a){return a.replace(/\xa0|\s/g," ")};goog.string.normalizeSpaces=function(a){return a.replace(/\xa0|[ \t]+/g," ")};goog.string.collapseBreakingSpaces=function(a){return a.replace(/[\t\r\n ]+/g," ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g,"")};goog.string.trim=goog.TRUSTED_SITE&&String.prototype.trim?function(a){return a.trim()}:function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};goog.string.trimLeft=function(a){return a.replace(/^[\s\xa0]+/,"")};
goog.string.trimRight=function(a){return a.replace(/[\s\xa0]+$/,"")};goog.string.caseInsensitiveCompare=function(a,b){var c=String(a).toLowerCase(),d=String(b).toLowerCase();return c<d?-1:c==d?0:1};
goog.string.numberAwareCompare_=function(a,b,c){if(a==b)return 0;if(!a)return-1;if(!b)return 1;for(var d=a.toLowerCase().match(c),e=b.toLowerCase().match(c),f=Math.min(d.length,e.length),g=0;g<f;g++){c=d[g];var h=e[g];if(c!=h)return a=parseInt(c,10),!isNaN(a)&&(b=parseInt(h,10),!isNaN(b)&&a-b)?a-b:c<h?-1:1}return d.length!=e.length?d.length-e.length:a<b?-1:1};goog.string.intAwareCompare=function(a,b){return goog.string.numberAwareCompare_(a,b,/\d+|\D+/g)};
goog.string.floatAwareCompare=function(a,b){return goog.string.numberAwareCompare_(a,b,/\d+|\.\d+|\D+/g)};goog.string.numerateCompare=goog.string.floatAwareCompare;goog.string.urlEncode=function(a){return encodeURIComponent(String(a))};goog.string.urlDecode=function(a){return decodeURIComponent(a.replace(/\+/g," "))};goog.string.newLineToBr=function(a,b){return a.replace(/(\r\n|\r|\n)/g,b?"<br />":"<br>")};
goog.string.htmlEscape=function(a,b){if(b)a=a.replace(goog.string.AMP_RE_,"&amp;").replace(goog.string.LT_RE_,"&lt;").replace(goog.string.GT_RE_,"&gt;").replace(goog.string.QUOT_RE_,"&quot;").replace(goog.string.SINGLE_QUOTE_RE_,"&#39;").replace(goog.string.NULL_RE_,"&#0;"),goog.string.DETECT_DOUBLE_ESCAPING&&(a=a.replace(goog.string.E_RE_,"&#101;"));else{if(!goog.string.ALL_RE_.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(goog.string.AMP_RE_,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(goog.string.LT_RE_,
"&lt;"));-1!=a.indexOf(">")&&(a=a.replace(goog.string.GT_RE_,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(goog.string.QUOT_RE_,"&quot;"));-1!=a.indexOf("'")&&(a=a.replace(goog.string.SINGLE_QUOTE_RE_,"&#39;"));-1!=a.indexOf("\x00")&&(a=a.replace(goog.string.NULL_RE_,"&#0;"));goog.string.DETECT_DOUBLE_ESCAPING&&-1!=a.indexOf("e")&&(a=a.replace(goog.string.E_RE_,"&#101;"))}return a};goog.string.AMP_RE_=/&/g;goog.string.LT_RE_=/</g;goog.string.GT_RE_=/>/g;goog.string.QUOT_RE_=/"/g;
goog.string.SINGLE_QUOTE_RE_=/'/g;goog.string.NULL_RE_=/\x00/g;goog.string.E_RE_=/e/g;goog.string.ALL_RE_=goog.string.DETECT_DOUBLE_ESCAPING?/[\x00&<>"'e]/:/[\x00&<>"']/;goog.string.unescapeEntities=function(a){return goog.string.contains(a,"&")?!goog.string.FORCE_NON_DOM_HTML_UNESCAPING&&"document"in goog.global?goog.string.unescapeEntitiesUsingDom_(a):goog.string.unescapePureXmlEntities_(a):a};
goog.string.unescapeEntitiesWithDocument=function(a,b){return goog.string.contains(a,"&")?goog.string.unescapeEntitiesUsingDom_(a,b):a};
goog.string.unescapeEntitiesUsingDom_=function(a,b){var c={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"'},d;d=b?b.createElement("div"):goog.global.document.createElement("div");return a.replace(goog.string.HTML_ENTITY_PATTERN_,function(a,b){var g=c[a];if(g)return g;if("#"==b.charAt(0)){var h=Number("0"+b.substr(1));isNaN(h)||(g=String.fromCharCode(h))}g||(d.innerHTML=a+" ",g=d.firstChild.nodeValue.slice(0,-1));return c[a]=g})};
goog.string.unescapePureXmlEntities_=function(a){return a.replace(/&([^;]+);/g,function(a,c){switch(c){case "amp":return"&";case "lt":return"<";case "gt":return">";case "quot":return'"';default:if("#"==c.charAt(0)){var d=Number("0"+c.substr(1));if(!isNaN(d))return String.fromCharCode(d)}return a}})};goog.string.HTML_ENTITY_PATTERN_=/&([^;\s<&]+);?/g;goog.string.whitespaceEscape=function(a,b){return goog.string.newLineToBr(a.replace(/  /g," &#160;"),b)};
goog.string.preserveSpaces=function(a){return a.replace(/(^|[\n ]) /g,"$1"+goog.string.Unicode.NBSP)};goog.string.stripQuotes=function(a,b){for(var c=b.length,d=0;d<c;d++){var e=1==c?b:b.charAt(d);if(a.charAt(0)==e&&a.charAt(a.length-1)==e)return a.substring(1,a.length-1)}return a};goog.string.truncate=function(a,b,c){c&&(a=goog.string.unescapeEntities(a));a.length>b&&(a=a.substring(0,b-3)+"...");c&&(a=goog.string.htmlEscape(a));return a};
goog.string.truncateMiddle=function(a,b,c,d){c&&(a=goog.string.unescapeEntities(a));if(d&&a.length>b){d>b&&(d=b);var e=a.length-d;a=a.substring(0,b-d)+"..."+a.substring(e)}else a.length>b&&(d=Math.floor(b/2),e=a.length-d,a=a.substring(0,d+b%2)+"..."+a.substring(e));c&&(a=goog.string.htmlEscape(a));return a};goog.string.specialEscapeChars_={"\x00":"\\0","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\x0B",'"':'\\"',"\\":"\\\\","<":"<"};goog.string.jsEscapeCache_={"'":"\\'"};
goog.string.quote=function(a){a=String(a);for(var b=['"'],c=0;c<a.length;c++){var d=a.charAt(c),e=d.charCodeAt(0);b[c+1]=goog.string.specialEscapeChars_[d]||(31<e&&127>e?d:goog.string.escapeChar(d))}b.push('"');return b.join("")};goog.string.escapeString=function(a){for(var b=[],c=0;c<a.length;c++)b[c]=goog.string.escapeChar(a.charAt(c));return b.join("")};
goog.string.escapeChar=function(a){if(a in goog.string.jsEscapeCache_)return goog.string.jsEscapeCache_[a];if(a in goog.string.specialEscapeChars_)return goog.string.jsEscapeCache_[a]=goog.string.specialEscapeChars_[a];var b,c=a.charCodeAt(0);if(31<c&&127>c)b=a;else{if(256>c){if(b="\\x",16>c||256<c)b+="0"}else b="\\u",4096>c&&(b+="0");b+=c.toString(16).toUpperCase()}return goog.string.jsEscapeCache_[a]=b};goog.string.contains=function(a,b){return-1!=a.indexOf(b)};
goog.string.caseInsensitiveContains=function(a,b){return goog.string.contains(a.toLowerCase(),b.toLowerCase())};goog.string.countOf=function(a,b){return a&&b?a.split(b).length-1:0};goog.string.removeAt=function(a,b,c){var d=a;0<=b&&b<a.length&&0<c&&(d=a.substr(0,b)+a.substr(b+c,a.length-b-c));return d};goog.string.remove=function(a,b){var c=new RegExp(goog.string.regExpEscape(b),"");return a.replace(c,"")};
goog.string.removeAll=function(a,b){var c=new RegExp(goog.string.regExpEscape(b),"g");return a.replace(c,"")};goog.string.regExpEscape=function(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")};goog.string.repeat=String.prototype.repeat?function(a,b){return a.repeat(b)}:function(a,b){return Array(b+1).join(a)};
goog.string.padNumber=function(a,b,c){a=goog.isDef(c)?a.toFixed(c):String(a);c=a.indexOf(".");-1==c&&(c=a.length);return goog.string.repeat("0",Math.max(0,b-c))+a};goog.string.makeSafe=function(a){return null==a?"":String(a)};goog.string.buildString=function(a){return Array.prototype.join.call(arguments,"")};goog.string.getRandomString=function(){return Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^goog.now()).toString(36)};
goog.string.compareVersions=function(a,b){for(var c=0,d=goog.string.trim(String(a)).split("."),e=goog.string.trim(String(b)).split("."),f=Math.max(d.length,e.length),g=0;0==c&&g<f;g++){var h=d[g]||"",k=e[g]||"",l=RegExp("(\\d*)(\\D*)","g"),p=RegExp("(\\d*)(\\D*)","g");do{var m=l.exec(h)||["","",""],n=p.exec(k)||["","",""];if(0==m[0].length&&0==n[0].length)break;var c=0==m[1].length?0:parseInt(m[1],10),q=0==n[1].length?0:parseInt(n[1],10),c=goog.string.compareElements_(c,q)||goog.string.compareElements_(0==
m[2].length,0==n[2].length)||goog.string.compareElements_(m[2],n[2])}while(0==c)}return c};goog.string.compareElements_=function(a,b){return a<b?-1:a>b?1:0};goog.string.hashCode=function(a){for(var b=0,c=0;c<a.length;++c)b=31*b+a.charCodeAt(c)>>>0;return b};goog.string.uniqueStringCounter_=2147483648*Math.random()|0;goog.string.createUniqueString=function(){return"goog_"+goog.string.uniqueStringCounter_++};
goog.string.toNumber=function(a){var b=Number(a);return 0==b&&goog.string.isEmptyOrWhitespace(a)?NaN:b};goog.string.isLowerCamelCase=function(a){return/^[a-z]+([A-Z][a-z]*)*$/.test(a)};goog.string.isUpperCamelCase=function(a){return/^([A-Z][a-z]*)+$/.test(a)};goog.string.toCamelCase=function(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})};goog.string.toSelectorCase=function(a){return String(a).replace(/([A-Z])/g,"-$1").toLowerCase()};
goog.string.toTitleCase=function(a,b){var c=goog.isString(b)?goog.string.regExpEscape(b):"\\s";return a.replace(new RegExp("(^"+(c?"|["+c+"]+":"")+")([a-z])","g"),function(a,b,c){return b+c.toUpperCase()})};goog.string.capitalize=function(a){return String(a.charAt(0)).toUpperCase()+String(a.substr(1)).toLowerCase()};goog.string.parseInt=function(a){isFinite(a)&&(a=String(a));return goog.isString(a)?/^\s*-?0x/i.test(a)?parseInt(a,16):parseInt(a,10):NaN};
goog.string.splitLimit=function(a,b,c){a=a.split(b);for(var d=[];0<c&&a.length;)d.push(a.shift()),c--;a.length&&d.push(a.join(b));return d};goog.string.editDistance=function(a,b){var c=[],d=[];if(a==b)return 0;if(!a.length||!b.length)return Math.max(a.length,b.length);for(var e=0;e<b.length+1;e++)c[e]=e;for(e=0;e<a.length;e++){d[0]=e+1;for(var f=0;f<b.length;f++)d[f+1]=Math.min(d[f]+1,c[f+1]+1,c[f]+Number(a[e]!=b[f]));for(f=0;f<c.length;f++)c[f]=d[f]}return d[b.length]};goog.asserts={};goog.asserts.ENABLE_ASSERTS=goog.DEBUG;goog.asserts.AssertionError=function(a,b){b.unshift(a);goog.debug.Error.call(this,goog.string.subs.apply(null,b));b.shift();this.messagePattern=a};goog.inherits(goog.asserts.AssertionError,goog.debug.Error);goog.asserts.AssertionError.prototype.name="AssertionError";goog.asserts.DEFAULT_ERROR_HANDLER=function(a){throw a;};goog.asserts.errorHandler_=goog.asserts.DEFAULT_ERROR_HANDLER;
goog.asserts.doAssertFailure_=function(a,b,c,d){var e="Assertion failed";if(c)var e=e+(": "+c),f=d;else a&&(e+=": "+a,f=b);a=new goog.asserts.AssertionError(""+e,f||[]);goog.asserts.errorHandler_(a)};goog.asserts.setErrorHandler=function(a){goog.asserts.ENABLE_ASSERTS&&(goog.asserts.errorHandler_=a)};goog.asserts.assert=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!a&&goog.asserts.doAssertFailure_("",null,b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.fail=function(a,b){goog.asserts.ENABLE_ASSERTS&&goog.asserts.errorHandler_(new goog.asserts.AssertionError("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1)))};goog.asserts.assertNumber=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isNumber(a)&&goog.asserts.doAssertFailure_("Expected number but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertString=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isString(a)&&goog.asserts.doAssertFailure_("Expected string but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertFunction=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isFunction(a)&&goog.asserts.doAssertFailure_("Expected function but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertObject=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isObject(a)&&goog.asserts.doAssertFailure_("Expected object but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertArray=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isArray(a)&&goog.asserts.doAssertFailure_("Expected array but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertBoolean=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isBoolean(a)&&goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertElement=function(a,b,c){!goog.asserts.ENABLE_ASSERTS||goog.isObject(a)&&a.nodeType==goog.dom.NodeType.ELEMENT||goog.asserts.doAssertFailure_("Expected Element but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertInstanceof=function(a,b,c,d){!goog.asserts.ENABLE_ASSERTS||a instanceof b||goog.asserts.doAssertFailure_("Expected instanceof %s but got %s.",[goog.asserts.getType_(b),goog.asserts.getType_(a)],c,Array.prototype.slice.call(arguments,3));return a};goog.asserts.assertObjectPrototypeIsIntact=function(){for(var a in Object.prototype)goog.asserts.fail(a+" should not be enumerable in Object.prototype.")};
goog.asserts.getType_=function(a){return a instanceof Function?a.displayName||a.name||"unknown type name":a instanceof Object?a.constructor.displayName||a.constructor.name||Object.prototype.toString.call(a):null===a?"null":typeof a};var jspb={Map:function(a,b){this.arr_=a;this.valueCtor_=b;this.map_={};this.arrClean=!0;0<this.arr_.length&&this.loadFromArray_()}};jspb.Map.prototype.loadFromArray_=function(){for(var a=0;a<this.arr_.length;a++){var b=this.arr_[a],c=b[0];this.map_[c.toString()]=new jspb.Map.Entry_(c,b[1])}this.arrClean=!0};
jspb.Map.prototype.toArray=function(){if(this.arrClean){if(this.valueCtor_){var a=this.map_,b;for(b in a)if(Object.prototype.hasOwnProperty.call(a,b)){var c=a[b].valueWrapper;c&&c.toArray()}}}else{this.arr_.length=0;a=this.stringKeys_();a.sort();for(b=0;b<a.length;b++){var d=this.map_[a[b]];(c=d.valueWrapper)&&c.toArray();this.arr_.push([d.key,d.value])}this.arrClean=!0}return this.arr_};
jspb.Map.prototype.toObject=function(a,b){for(var c=this.toArray(),d=[],e=0;e<c.length;e++){var f=this.map_[c[e][0].toString()];this.wrapEntry_(f);var g=f.valueWrapper;g?(goog.asserts.assert(b),d.push([f.key,b(a,g)])):d.push([f.key,f.value])}return d};jspb.Map.fromObject=function(a,b,c){b=new jspb.Map([],b);for(var d=0;d<a.length;d++){var e=a[d][0],f=c(a[d][1]);b.set(e,f)}return b};jspb.Map.ArrayIteratorIterable_=function(a){this.idx_=0;this.arr_=a};
jspb.Map.ArrayIteratorIterable_.prototype.next=function(){return this.idx_<this.arr_.length?{done:!1,value:this.arr_[this.idx_++]}:{done:!0,value:void 0}};$jscomp.initSymbol();"undefined"!=typeof Symbol&&($jscomp.initSymbol(),$jscomp.initSymbolIterator(),jspb.Map.ArrayIteratorIterable_.prototype[Symbol.iterator]=function(){return this});jspb.Map.prototype.getLength=function(){return this.stringKeys_().length};jspb.Map.prototype.clear=function(){this.map_={};this.arrClean=!1};
jspb.Map.prototype.del=function(a){a=a.toString();var b=this.map_.hasOwnProperty(a);delete this.map_[a];this.arrClean=!1;return b};jspb.Map.prototype.getEntryList=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++){var d=this.map_[b[c]];a.push([d.key,d.value])}return a};jspb.Map.prototype.entries=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++){var d=this.map_[b[c]];a.push([d.key,this.wrapEntry_(d)])}return new jspb.Map.ArrayIteratorIterable_(a)};
jspb.Map.prototype.keys=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++)a.push(this.map_[b[c]].key);return new jspb.Map.ArrayIteratorIterable_(a)};jspb.Map.prototype.values=function(){var a=[],b=this.stringKeys_();b.sort();for(var c=0;c<b.length;c++)a.push(this.wrapEntry_(this.map_[b[c]]));return new jspb.Map.ArrayIteratorIterable_(a)};
jspb.Map.prototype.forEach=function(a,b){var c=this.stringKeys_();c.sort();for(var d=0;d<c.length;d++){var e=this.map_[c[d]];a.call(b,this.wrapEntry_(e),e.key,this)}};jspb.Map.prototype.set=function(a,b){var c=new jspb.Map.Entry_(a);this.valueCtor_?(c.valueWrapper=b,c.value=b.toArray()):c.value=b;this.map_[a.toString()]=c;this.arrClean=!1;return this};jspb.Map.prototype.wrapEntry_=function(a){return this.valueCtor_?(a.valueWrapper||(a.valueWrapper=new this.valueCtor_(a.value)),a.valueWrapper):a.value};
jspb.Map.prototype.get=function(a){if(a=this.map_[a.toString()])return this.wrapEntry_(a)};jspb.Map.prototype.has=function(a){return a.toString()in this.map_};jspb.Map.prototype.serializeBinary=function(a,b,c,d,e){var f=this.stringKeys_();f.sort();for(var g=0;g<f.length;g++){var h=this.map_[f[g]];b.beginSubMessage(a);c.call(b,1,h.key);this.valueCtor_?d.call(b,2,this.wrapEntry_(h),e):d.call(b,2,h.value);b.endSubMessage()}};
jspb.Map.deserializeBinary=function(a,b,c,d,e,f){for(var g=void 0;b.nextField()&&!b.isEndGroup();){var h=b.getFieldNumber();1==h?f=c.call(b):2==h&&(a.valueCtor_?(goog.asserts.assert(e),g=new a.valueCtor_,d.call(b,g,e)):g=d.call(b))}goog.asserts.assert(void 0!=f);goog.asserts.assert(void 0!=g);a.set(f,g)};jspb.Map.prototype.stringKeys_=function(){var a=this.map_,b=[],c;for(c in a)Object.prototype.hasOwnProperty.call(a,c)&&b.push(c);return b};
jspb.Map.Entry_=function(a,b){this.key=a;this.value=b;this.valueWrapper=void 0};goog.array={};goog.NATIVE_ARRAY_PROTOTYPES=goog.TRUSTED_SITE;goog.array.ASSUME_NATIVE_FUNCTIONS=!1;goog.array.peek=function(a){return a[a.length-1]};goog.array.last=goog.array.peek;
goog.array.indexOf=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.indexOf)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(goog.isString(a))return goog.isString(b)&&1==b.length?a.indexOf(b,c):-1;for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1};
goog.array.lastIndexOf=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.lastIndexOf)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.lastIndexOf.call(a,b,null==c?a.length-1:c)}:function(a,b,c){c=null==c?a.length-1:c;0>c&&(c=Math.max(0,a.length+c));if(goog.isString(a))return goog.isString(b)&&1==b.length?a.lastIndexOf(b,c):-1;for(;0<=c;c--)if(c in a&&a[c]===b)return c;return-1};
goog.array.forEach=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.forEach)?function(a,b,c){goog.asserts.assert(null!=a.length);Array.prototype.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)};goog.array.forEachRight=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,d=d-1;0<=d;--d)d in e&&b.call(c,e[d],d,a)};
goog.array.filter=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.filter)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=goog.isString(a)?a.split(""):a,h=0;h<d;h++)if(h in g){var k=g[h];b.call(c,k,h,a)&&(e[f++]=k)}return e};
goog.array.map=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.map)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=goog.isString(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e};
goog.array.reduce=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.reduce)?function(a,b,c,d){goog.asserts.assert(null!=a.length);d&&(b=goog.bind(b,d));return Array.prototype.reduce.call(a,b,c)}:function(a,b,c,d){var e=c;goog.array.forEach(a,function(c,g){e=b.call(d,e,c,g,a)});return e};
goog.array.reduceRight=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.reduceRight)?function(a,b,c,d){goog.asserts.assert(null!=a.length);goog.asserts.assert(null!=b);d&&(b=goog.bind(b,d));return Array.prototype.reduceRight.call(a,b,c)}:function(a,b,c,d){var e=c;goog.array.forEachRight(a,function(c,g){e=b.call(d,e,c,g,a)});return e};
goog.array.some=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.some)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1};
goog.array.every=goog.NATIVE_ARRAY_PROTOTYPES&&(goog.array.ASSUME_NATIVE_FUNCTIONS||Array.prototype.every)?function(a,b,c){goog.asserts.assert(null!=a.length);return Array.prototype.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};goog.array.count=function(a,b,c){var d=0;goog.array.forEach(a,function(a,f,g){b.call(c,a,f,g)&&++d},c);return d};
goog.array.find=function(a,b,c){b=goog.array.findIndex(a,b,c);return 0>b?null:goog.isString(a)?a.charAt(b):a[b]};goog.array.findIndex=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return f;return-1};goog.array.findRight=function(a,b,c){b=goog.array.findIndexRight(a,b,c);return 0>b?null:goog.isString(a)?a.charAt(b):a[b]};
goog.array.findIndexRight=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,d=d-1;0<=d;d--)if(d in e&&b.call(c,e[d],d,a))return d;return-1};goog.array.contains=function(a,b){return 0<=goog.array.indexOf(a,b)};goog.array.isEmpty=function(a){return 0==a.length};goog.array.clear=function(a){if(!goog.isArray(a))for(var b=a.length-1;0<=b;b--)delete a[b];a.length=0};goog.array.insert=function(a,b){goog.array.contains(a,b)||a.push(b)};
goog.array.insertAt=function(a,b,c){goog.array.splice(a,c,0,b)};goog.array.insertArrayAt=function(a,b,c){goog.partial(goog.array.splice,a,c,0).apply(null,b)};goog.array.insertBefore=function(a,b,c){var d;2==arguments.length||0>(d=goog.array.indexOf(a,c))?a.push(b):goog.array.insertAt(a,b,d)};goog.array.remove=function(a,b){var c=goog.array.indexOf(a,b),d;(d=0<=c)&&goog.array.removeAt(a,c);return d};
goog.array.removeAt=function(a,b){goog.asserts.assert(null!=a.length);return 1==Array.prototype.splice.call(a,b,1).length};goog.array.removeIf=function(a,b,c){b=goog.array.findIndex(a,b,c);return 0<=b?(goog.array.removeAt(a,b),!0):!1};goog.array.removeAllIf=function(a,b,c){var d=0;goog.array.forEachRight(a,function(e,f){b.call(c,e,f,a)&&goog.array.removeAt(a,f)&&d++});return d};goog.array.concat=function(a){return Array.prototype.concat.apply(Array.prototype,arguments)};
goog.array.join=function(a){return Array.prototype.concat.apply(Array.prototype,arguments)};goog.array.toArray=function(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]};goog.array.clone=goog.array.toArray;goog.array.extend=function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c];if(goog.isArrayLike(d)){var e=a.length||0,f=d.length||0;a.length=e+f;for(var g=0;g<f;g++)a[e+g]=d[g]}else a.push(d)}};
goog.array.splice=function(a,b,c,d){goog.asserts.assert(null!=a.length);return Array.prototype.splice.apply(a,goog.array.slice(arguments,1))};goog.array.slice=function(a,b,c){goog.asserts.assert(null!=a.length);return 2>=arguments.length?Array.prototype.slice.call(a,b):Array.prototype.slice.call(a,b,c)};
goog.array.removeDuplicates=function(a,b,c){b=b||a;var d=function(a){return goog.isObject(a)?"o"+goog.getUid(a):(typeof a).charAt(0)+a};c=c||d;for(var d={},e=0,f=0;f<a.length;){var g=a[f++],h=c(g);Object.prototype.hasOwnProperty.call(d,h)||(d[h]=!0,b[e++]=g)}b.length=e};goog.array.binarySearch=function(a,b,c){return goog.array.binarySearch_(a,c||goog.array.defaultCompare,!1,b)};goog.array.binarySelect=function(a,b,c){return goog.array.binarySearch_(a,b,!0,void 0,c)};
goog.array.binarySearch_=function(a,b,c,d,e){for(var f=0,g=a.length,h;f<g;){var k=f+g>>1,l;l=c?b.call(e,a[k],k,a):b(d,a[k]);0<l?f=k+1:(g=k,h=!l)}return h?f:~f};goog.array.sort=function(a,b){a.sort(b||goog.array.defaultCompare)};goog.array.stableSort=function(a,b){for(var c=0;c<a.length;c++)a[c]={index:c,value:a[c]};var d=b||goog.array.defaultCompare;goog.array.sort(a,function(a,b){return d(a.value,b.value)||a.index-b.index});for(c=0;c<a.length;c++)a[c]=a[c].value};
goog.array.sortByKey=function(a,b,c){var d=c||goog.array.defaultCompare;goog.array.sort(a,function(a,c){return d(b(a),b(c))})};goog.array.sortObjectsByKey=function(a,b,c){goog.array.sortByKey(a,function(a){return a[b]},c)};goog.array.isSorted=function(a,b,c){b=b||goog.array.defaultCompare;for(var d=1;d<a.length;d++){var e=b(a[d-1],a[d]);if(0<e||0==e&&c)return!1}return!0};
goog.array.equals=function(a,b,c){if(!goog.isArrayLike(a)||!goog.isArrayLike(b)||a.length!=b.length)return!1;var d=a.length;c=c||goog.array.defaultCompareEquality;for(var e=0;e<d;e++)if(!c(a[e],b[e]))return!1;return!0};goog.array.compare3=function(a,b,c){c=c||goog.array.defaultCompare;for(var d=Math.min(a.length,b.length),e=0;e<d;e++){var f=c(a[e],b[e]);if(0!=f)return f}return goog.array.defaultCompare(a.length,b.length)};goog.array.defaultCompare=function(a,b){return a>b?1:a<b?-1:0};
goog.array.inverseDefaultCompare=function(a,b){return-goog.array.defaultCompare(a,b)};goog.array.defaultCompareEquality=function(a,b){return a===b};goog.array.binaryInsert=function(a,b,c){c=goog.array.binarySearch(a,b,c);return 0>c?(goog.array.insertAt(a,b,-(c+1)),!0):!1};goog.array.binaryRemove=function(a,b,c){b=goog.array.binarySearch(a,b,c);return 0<=b?goog.array.removeAt(a,b):!1};
goog.array.bucket=function(a,b,c){for(var d={},e=0;e<a.length;e++){var f=a[e],g=b.call(c,f,e,a);goog.isDef(g)&&(d[g]||(d[g]=[])).push(f)}return d};goog.array.toObject=function(a,b,c){var d={};goog.array.forEach(a,function(e,f){d[b.call(c,e,f,a)]=e});return d};goog.array.range=function(a,b,c){var d=[],e=0,f=a;c=c||1;void 0!==b&&(e=a,f=b);if(0>c*(f-e))return[];if(0<c)for(a=e;a<f;a+=c)d.push(a);else for(a=e;a>f;a+=c)d.push(a);return d};
goog.array.repeat=function(a,b){for(var c=[],d=0;d<b;d++)c[d]=a;return c};goog.array.flatten=function(a){for(var b=[],c=0;c<arguments.length;c++){var d=arguments[c];if(goog.isArray(d))for(var e=0;e<d.length;e+=8192)for(var f=goog.array.slice(d,e,e+8192),f=goog.array.flatten.apply(null,f),g=0;g<f.length;g++)b.push(f[g]);else b.push(d)}return b};
goog.array.rotate=function(a,b){goog.asserts.assert(null!=a.length);a.length&&(b%=a.length,0<b?Array.prototype.unshift.apply(a,a.splice(-b,b)):0>b&&Array.prototype.push.apply(a,a.splice(0,-b)));return a};goog.array.moveItem=function(a,b,c){goog.asserts.assert(0<=b&&b<a.length);goog.asserts.assert(0<=c&&c<a.length);b=Array.prototype.splice.call(a,b,1);Array.prototype.splice.call(a,c,0,b[0])};
goog.array.zip=function(a){if(!arguments.length)return[];for(var b=[],c=arguments[0].length,d=1;d<arguments.length;d++)arguments[d].length<c&&(c=arguments[d].length);for(d=0;d<c;d++){for(var e=[],f=0;f<arguments.length;f++)e.push(arguments[f][d]);b.push(e)}return b};goog.array.shuffle=function(a,b){for(var c=b||Math.random,d=a.length-1;0<d;d--){var e=Math.floor(c()*(d+1)),f=a[d];a[d]=a[e];a[e]=f}};goog.array.copyByIndex=function(a,b){var c=[];goog.array.forEach(b,function(b){c.push(a[b])});return c};goog.crypt={};goog.crypt.stringToByteArray=function(a){for(var b=[],c=0,d=0;d<a.length;d++){for(var e=a.charCodeAt(d);255<e;)b[c++]=e&255,e>>=8;b[c++]=e}return b};goog.crypt.byteArrayToString=function(a){if(8192>=a.length)return String.fromCharCode.apply(null,a);for(var b="",c=0;c<a.length;c+=8192)var d=goog.array.slice(a,c,c+8192),b=b+String.fromCharCode.apply(null,d);return b};goog.crypt.byteArrayToHex=function(a){return goog.array.map(a,function(a){a=a.toString(16);return 1<a.length?a:"0"+a}).join("")};
goog.crypt.hexToByteArray=function(a){goog.asserts.assert(0==a.length%2,"Key string length must be multiple of 2");for(var b=[],c=0;c<a.length;c+=2)b.push(parseInt(a.substring(c,c+2),16));return b};
goog.crypt.stringToUtf8ByteArray=function(a){for(var b=[],c=0,d=0;d<a.length;d++){var e=a.charCodeAt(d);128>e?b[c++]=e:(2048>e?b[c++]=e>>6|192:(55296==(e&64512)&&d+1<a.length&&56320==(a.charCodeAt(d+1)&64512)?(e=65536+((e&1023)<<10)+(a.charCodeAt(++d)&1023),b[c++]=e>>18|240,b[c++]=e>>12&63|128):b[c++]=e>>12|224,b[c++]=e>>6&63|128),b[c++]=e&63|128)}return b};
goog.crypt.utf8ByteArrayToString=function(a){for(var b=[],c=0,d=0;c<a.length;){var e=a[c++];if(128>e)b[d++]=String.fromCharCode(e);else if(191<e&&224>e){var f=a[c++];b[d++]=String.fromCharCode((e&31)<<6|f&63)}else if(239<e&&365>e){var f=a[c++],g=a[c++],h=a[c++],e=((e&7)<<18|(f&63)<<12|(g&63)<<6|h&63)-65536;b[d++]=String.fromCharCode(55296+(e>>10));b[d++]=String.fromCharCode(56320+(e&1023))}else f=a[c++],g=a[c++],b[d++]=String.fromCharCode((e&15)<<12|(f&63)<<6|g&63)}return b.join("")};
goog.crypt.xorByteArray=function(a,b){goog.asserts.assert(a.length==b.length,"XOR array lengths must match");for(var c=[],d=0;d<a.length;d++)c.push(a[d]^b[d]);return c};goog.labs={};goog.labs.userAgent={};goog.labs.userAgent.util={};goog.labs.userAgent.util.getNativeUserAgentString_=function(){var a=goog.labs.userAgent.util.getNavigator_();return a&&(a=a.userAgent)?a:""};goog.labs.userAgent.util.getNavigator_=function(){return goog.global.navigator};goog.labs.userAgent.util.userAgent_=goog.labs.userAgent.util.getNativeUserAgentString_();goog.labs.userAgent.util.setUserAgent=function(a){goog.labs.userAgent.util.userAgent_=a||goog.labs.userAgent.util.getNativeUserAgentString_()};
goog.labs.userAgent.util.getUserAgent=function(){return goog.labs.userAgent.util.userAgent_};goog.labs.userAgent.util.matchUserAgent=function(a){var b=goog.labs.userAgent.util.getUserAgent();return goog.string.contains(b,a)};goog.labs.userAgent.util.matchUserAgentIgnoreCase=function(a){var b=goog.labs.userAgent.util.getUserAgent();return goog.string.caseInsensitiveContains(b,a)};
goog.labs.userAgent.util.extractVersionTuples=function(a){for(var b=RegExp("(\\w[\\w ]+)/([^\\s]+)\\s*(?:\\((.*?)\\))?","g"),c=[],d;d=b.exec(a);)c.push([d[1],d[2],d[3]||void 0]);return c};goog.labs.userAgent.platform={};goog.labs.userAgent.platform.isAndroid=function(){return goog.labs.userAgent.util.matchUserAgent("Android")};goog.labs.userAgent.platform.isIpod=function(){return goog.labs.userAgent.util.matchUserAgent("iPod")};goog.labs.userAgent.platform.isIphone=function(){return goog.labs.userAgent.util.matchUserAgent("iPhone")&&!goog.labs.userAgent.util.matchUserAgent("iPod")&&!goog.labs.userAgent.util.matchUserAgent("iPad")};goog.labs.userAgent.platform.isIpad=function(){return goog.labs.userAgent.util.matchUserAgent("iPad")};
goog.labs.userAgent.platform.isIos=function(){return goog.labs.userAgent.platform.isIphone()||goog.labs.userAgent.platform.isIpad()||goog.labs.userAgent.platform.isIpod()};goog.labs.userAgent.platform.isMacintosh=function(){return goog.labs.userAgent.util.matchUserAgent("Macintosh")};goog.labs.userAgent.platform.isLinux=function(){return goog.labs.userAgent.util.matchUserAgent("Linux")};goog.labs.userAgent.platform.isWindows=function(){return goog.labs.userAgent.util.matchUserAgent("Windows")};
goog.labs.userAgent.platform.isChromeOS=function(){return goog.labs.userAgent.util.matchUserAgent("CrOS")};
goog.labs.userAgent.platform.getVersion=function(){var a=goog.labs.userAgent.util.getUserAgent(),b="";goog.labs.userAgent.platform.isWindows()?(b=/Windows (?:NT|Phone) ([0-9.]+)/,b=(a=b.exec(a))?a[1]:"0.0"):goog.labs.userAgent.platform.isIos()?(b=/(?:iPhone|iPod|iPad|CPU)\s+OS\s+(\S+)/,b=(a=b.exec(a))&&a[1].replace(/_/g,".")):goog.labs.userAgent.platform.isMacintosh()?(b=/Mac OS X ([0-9_.]+)/,b=(a=b.exec(a))?a[1].replace(/_/g,"."):"10"):goog.labs.userAgent.platform.isAndroid()?(b=/Android\s+([^\);]+)(\)|;)/,
b=(a=b.exec(a))&&a[1]):goog.labs.userAgent.platform.isChromeOS()&&(b=/(?:CrOS\s+(?:i686|x86_64)\s+([0-9.]+))/,b=(a=b.exec(a))&&a[1]);return b||""};goog.labs.userAgent.platform.isVersionOrHigher=function(a){return 0<=goog.string.compareVersions(goog.labs.userAgent.platform.getVersion(),a)};goog.object={};goog.object.forEach=function(a,b,c){for(var d in a)b.call(c,a[d],d,a)};goog.object.filter=function(a,b,c){var d={},e;for(e in a)b.call(c,a[e],e,a)&&(d[e]=a[e]);return d};goog.object.map=function(a,b,c){var d={},e;for(e in a)d[e]=b.call(c,a[e],e,a);return d};goog.object.some=function(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return!0;return!1};goog.object.every=function(a,b,c){for(var d in a)if(!b.call(c,a[d],d,a))return!1;return!0};
goog.object.getCount=function(a){var b=0,c;for(c in a)b++;return b};goog.object.getAnyKey=function(a){for(var b in a)return b};goog.object.getAnyValue=function(a){for(var b in a)return a[b]};goog.object.contains=function(a,b){return goog.object.containsValue(a,b)};goog.object.getValues=function(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b};goog.object.getKeys=function(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b};
goog.object.getValueByKeys=function(a,b){for(var c=goog.isArrayLike(b),d=c?b:arguments,c=c?0:1;c<d.length&&(a=a[d[c]],goog.isDef(a));c++);return a};goog.object.containsKey=function(a,b){return null!==a&&b in a};goog.object.containsValue=function(a,b){for(var c in a)if(a[c]==b)return!0;return!1};goog.object.findKey=function(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return d};goog.object.findValue=function(a,b,c){return(b=goog.object.findKey(a,b,c))&&a[b]};
goog.object.isEmpty=function(a){for(var b in a)return!1;return!0};goog.object.clear=function(a){for(var b in a)delete a[b]};goog.object.remove=function(a,b){var c;(c=b in a)&&delete a[b];return c};goog.object.add=function(a,b,c){if(null!==a&&b in a)throw Error('The object already contains the key "'+b+'"');goog.object.set(a,b,c)};goog.object.get=function(a,b,c){return null!==a&&b in a?a[b]:c};goog.object.set=function(a,b,c){a[b]=c};
goog.object.setIfUndefined=function(a,b,c){return b in a?a[b]:a[b]=c};goog.object.setWithReturnValueIfNotSet=function(a,b,c){if(b in a)return a[b];c=c();return a[b]=c};goog.object.equals=function(a,b){for(var c in a)if(!(c in b)||a[c]!==b[c])return!1;for(c in b)if(!(c in a))return!1;return!0};goog.object.clone=function(a){var b={},c;for(c in a)b[c]=a[c];return b};
goog.object.unsafeClone=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(goog.isFunction(a.clone))return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.object.unsafeClone(a[c]);return b}return a};goog.object.transpose=function(a){var b={},c;for(c in a)b[a[c]]=c;return b};goog.object.PROTOTYPE_FIELDS_="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.object.extend=function(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<goog.object.PROTOTYPE_FIELDS_.length;f++)c=goog.object.PROTOTYPE_FIELDS_[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};
goog.object.create=function(a){var b=arguments.length;if(1==b&&goog.isArray(arguments[0]))return goog.object.create.apply(null,arguments[0]);if(b%2)throw Error("Uneven number of arguments");for(var c={},d=0;d<b;d+=2)c[arguments[d]]=arguments[d+1];return c};goog.object.createSet=function(a){var b=arguments.length;if(1==b&&goog.isArray(arguments[0]))return goog.object.createSet.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};
goog.object.createImmutableView=function(a){var b=a;Object.isFrozen&&!Object.isFrozen(a)&&(b=Object.create(a),Object.freeze(b));return b};goog.object.isImmutableView=function(a){return!!Object.isFrozen&&Object.isFrozen(a)};goog.labs.userAgent.browser={};goog.labs.userAgent.browser.matchOpera_=function(){return goog.labs.userAgent.util.matchUserAgent("Opera")||goog.labs.userAgent.util.matchUserAgent("OPR")};goog.labs.userAgent.browser.matchIE_=function(){return goog.labs.userAgent.util.matchUserAgent("Trident")||goog.labs.userAgent.util.matchUserAgent("MSIE")};goog.labs.userAgent.browser.matchEdge_=function(){return goog.labs.userAgent.util.matchUserAgent("Edge")};goog.labs.userAgent.browser.matchFirefox_=function(){return goog.labs.userAgent.util.matchUserAgent("Firefox")};
goog.labs.userAgent.browser.matchSafari_=function(){return goog.labs.userAgent.util.matchUserAgent("Safari")&&!(goog.labs.userAgent.browser.matchChrome_()||goog.labs.userAgent.browser.matchCoast_()||goog.labs.userAgent.browser.matchOpera_()||goog.labs.userAgent.browser.matchEdge_()||goog.labs.userAgent.browser.isSilk()||goog.labs.userAgent.util.matchUserAgent("Android"))};goog.labs.userAgent.browser.matchCoast_=function(){return goog.labs.userAgent.util.matchUserAgent("Coast")};
goog.labs.userAgent.browser.matchIosWebview_=function(){return(goog.labs.userAgent.util.matchUserAgent("iPad")||goog.labs.userAgent.util.matchUserAgent("iPhone"))&&!goog.labs.userAgent.browser.matchSafari_()&&!goog.labs.userAgent.browser.matchChrome_()&&!goog.labs.userAgent.browser.matchCoast_()&&goog.labs.userAgent.util.matchUserAgent("AppleWebKit")};
goog.labs.userAgent.browser.matchChrome_=function(){return(goog.labs.userAgent.util.matchUserAgent("Chrome")||goog.labs.userAgent.util.matchUserAgent("CriOS"))&&!goog.labs.userAgent.browser.matchOpera_()&&!goog.labs.userAgent.browser.matchEdge_()};goog.labs.userAgent.browser.matchAndroidBrowser_=function(){return goog.labs.userAgent.util.matchUserAgent("Android")&&!(goog.labs.userAgent.browser.isChrome()||goog.labs.userAgent.browser.isFirefox()||goog.labs.userAgent.browser.isOpera()||goog.labs.userAgent.browser.isSilk())};
goog.labs.userAgent.browser.isOpera=goog.labs.userAgent.browser.matchOpera_;goog.labs.userAgent.browser.isIE=goog.labs.userAgent.browser.matchIE_;goog.labs.userAgent.browser.isEdge=goog.labs.userAgent.browser.matchEdge_;goog.labs.userAgent.browser.isFirefox=goog.labs.userAgent.browser.matchFirefox_;goog.labs.userAgent.browser.isSafari=goog.labs.userAgent.browser.matchSafari_;goog.labs.userAgent.browser.isCoast=goog.labs.userAgent.browser.matchCoast_;goog.labs.userAgent.browser.isIosWebview=goog.labs.userAgent.browser.matchIosWebview_;
goog.labs.userAgent.browser.isChrome=goog.labs.userAgent.browser.matchChrome_;goog.labs.userAgent.browser.isAndroidBrowser=goog.labs.userAgent.browser.matchAndroidBrowser_;goog.labs.userAgent.browser.isSilk=function(){return goog.labs.userAgent.util.matchUserAgent("Silk")};
goog.labs.userAgent.browser.getVersion=function(){function a(a){a=goog.array.find(a,d);return c[a]||""}var b=goog.labs.userAgent.util.getUserAgent();if(goog.labs.userAgent.browser.isIE())return goog.labs.userAgent.browser.getIEVersion_(b);var b=goog.labs.userAgent.util.extractVersionTuples(b),c={};goog.array.forEach(b,function(a){c[a[0]]=a[1]});var d=goog.partial(goog.object.containsKey,c);return goog.labs.userAgent.browser.isOpera()?a(["Version","Opera","OPR"]):goog.labs.userAgent.browser.isEdge()?
a(["Edge"]):goog.labs.userAgent.browser.isChrome()?a(["Chrome","CriOS"]):(b=b[2])&&b[1]||""};goog.labs.userAgent.browser.isVersionOrHigher=function(a){return 0<=goog.string.compareVersions(goog.labs.userAgent.browser.getVersion(),a)};
goog.labs.userAgent.browser.getIEVersion_=function(a){var b=/rv: *([\d\.]*)/.exec(a);if(b&&b[1])return b[1];var b="",c=/MSIE +([\d\.]+)/.exec(a);if(c&&c[1])if(a=/Trident\/(\d.\d)/.exec(a),"7.0"==c[1])if(a&&a[1])switch(a[1]){case "4.0":b="8.0";break;case "5.0":b="9.0";break;case "6.0":b="10.0";break;case "7.0":b="11.0"}else b="7.0";else b=c[1];return b};goog.labs.userAgent.engine={};goog.labs.userAgent.engine.isPresto=function(){return goog.labs.userAgent.util.matchUserAgent("Presto")};goog.labs.userAgent.engine.isTrident=function(){return goog.labs.userAgent.util.matchUserAgent("Trident")||goog.labs.userAgent.util.matchUserAgent("MSIE")};goog.labs.userAgent.engine.isEdge=function(){return goog.labs.userAgent.util.matchUserAgent("Edge")};
goog.labs.userAgent.engine.isWebKit=function(){return goog.labs.userAgent.util.matchUserAgentIgnoreCase("WebKit")&&!goog.labs.userAgent.engine.isEdge()};goog.labs.userAgent.engine.isGecko=function(){return goog.labs.userAgent.util.matchUserAgent("Gecko")&&!goog.labs.userAgent.engine.isWebKit()&&!goog.labs.userAgent.engine.isTrident()&&!goog.labs.userAgent.engine.isEdge()};
goog.labs.userAgent.engine.getVersion=function(){var a=goog.labs.userAgent.util.getUserAgent();if(a){var a=goog.labs.userAgent.util.extractVersionTuples(a),b=goog.labs.userAgent.engine.getEngineTuple_(a);if(b)return"Gecko"==b[0]?goog.labs.userAgent.engine.getVersionForKey_(a,"Firefox"):b[1];var a=a[0],c;if(a&&(c=a[2])&&(c=/Trident\/([^\s;]+)/.exec(c)))return c[1]}return""};
goog.labs.userAgent.engine.getEngineTuple_=function(a){if(!goog.labs.userAgent.engine.isEdge())return a[1];for(var b=0;b<a.length;b++){var c=a[b];if("Edge"==c[0])return c}};goog.labs.userAgent.engine.isVersionOrHigher=function(a){return 0<=goog.string.compareVersions(goog.labs.userAgent.engine.getVersion(),a)};goog.labs.userAgent.engine.getVersionForKey_=function(a,b){var c=goog.array.find(a,function(a){return b==a[0]});return c&&c[1]||""};goog.userAgent={};goog.userAgent.ASSUME_IE=!1;goog.userAgent.ASSUME_EDGE=!1;goog.userAgent.ASSUME_GECKO=!1;goog.userAgent.ASSUME_WEBKIT=!1;goog.userAgent.ASSUME_MOBILE_WEBKIT=!1;goog.userAgent.ASSUME_OPERA=!1;goog.userAgent.ASSUME_ANY_VERSION=!1;goog.userAgent.BROWSER_KNOWN_=goog.userAgent.ASSUME_IE||goog.userAgent.ASSUME_EDGE||goog.userAgent.ASSUME_GECKO||goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_OPERA;goog.userAgent.getUserAgentString=function(){return goog.labs.userAgent.util.getUserAgent()};
goog.userAgent.getNavigator=function(){return goog.global.navigator||null};goog.userAgent.OPERA=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_OPERA:goog.labs.userAgent.browser.isOpera();goog.userAgent.IE=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_IE:goog.labs.userAgent.browser.isIE();goog.userAgent.EDGE=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_EDGE:goog.labs.userAgent.engine.isEdge();goog.userAgent.EDGE_OR_IE=goog.userAgent.EDGE||goog.userAgent.IE;
goog.userAgent.GECKO=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_GECKO:goog.labs.userAgent.engine.isGecko();goog.userAgent.WEBKIT=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_MOBILE_WEBKIT:goog.labs.userAgent.engine.isWebKit();goog.userAgent.isMobile_=function(){return goog.userAgent.WEBKIT&&goog.labs.userAgent.util.matchUserAgent("Mobile")};goog.userAgent.MOBILE=goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.isMobile_();goog.userAgent.SAFARI=goog.userAgent.WEBKIT;
goog.userAgent.determinePlatform_=function(){var a=goog.userAgent.getNavigator();return a&&a.platform||""};goog.userAgent.PLATFORM=goog.userAgent.determinePlatform_();goog.userAgent.ASSUME_MAC=!1;goog.userAgent.ASSUME_WINDOWS=!1;goog.userAgent.ASSUME_LINUX=!1;goog.userAgent.ASSUME_X11=!1;goog.userAgent.ASSUME_ANDROID=!1;goog.userAgent.ASSUME_IPHONE=!1;goog.userAgent.ASSUME_IPAD=!1;
goog.userAgent.PLATFORM_KNOWN_=goog.userAgent.ASSUME_MAC||goog.userAgent.ASSUME_WINDOWS||goog.userAgent.ASSUME_LINUX||goog.userAgent.ASSUME_X11||goog.userAgent.ASSUME_ANDROID||goog.userAgent.ASSUME_IPHONE||goog.userAgent.ASSUME_IPAD;goog.userAgent.MAC=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_MAC:goog.labs.userAgent.platform.isMacintosh();goog.userAgent.WINDOWS=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_WINDOWS:goog.labs.userAgent.platform.isWindows();
goog.userAgent.isLegacyLinux_=function(){return goog.labs.userAgent.platform.isLinux()||goog.labs.userAgent.platform.isChromeOS()};goog.userAgent.LINUX=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_LINUX:goog.userAgent.isLegacyLinux_();goog.userAgent.isX11_=function(){var a=goog.userAgent.getNavigator();return!!a&&goog.string.contains(a.appVersion||"","X11")};goog.userAgent.X11=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_X11:goog.userAgent.isX11_();
goog.userAgent.ANDROID=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_ANDROID:goog.labs.userAgent.platform.isAndroid();goog.userAgent.IPHONE=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_IPHONE:goog.labs.userAgent.platform.isIphone();goog.userAgent.IPAD=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_IPAD:goog.labs.userAgent.platform.isIpad();goog.userAgent.operaVersion_=function(){var a=goog.global.opera.version;try{return a()}catch(b){return a}};
goog.userAgent.determineVersion_=function(){if(goog.userAgent.OPERA&&goog.global.opera)return goog.userAgent.operaVersion_();var a="",b=goog.userAgent.getVersionRegexResult_();b&&(a=b?b[1]:"");return goog.userAgent.IE&&(b=goog.userAgent.getDocumentMode_(),b>parseFloat(a))?String(b):a};
goog.userAgent.getVersionRegexResult_=function(){var a=goog.userAgent.getUserAgentString();if(goog.userAgent.GECKO)return/rv\:([^\);]+)(\)|;)/.exec(a);if(goog.userAgent.EDGE)return/Edge\/([\d\.]+)/.exec(a);if(goog.userAgent.IE)return/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(a);if(goog.userAgent.WEBKIT)return/WebKit\/(\S+)/.exec(a)};goog.userAgent.getDocumentMode_=function(){var a=goog.global.document;return a?a.documentMode:void 0};goog.userAgent.VERSION=goog.userAgent.determineVersion_();
goog.userAgent.compare=function(a,b){return goog.string.compareVersions(a,b)};goog.userAgent.isVersionOrHigherCache_={};goog.userAgent.isVersionOrHigher=function(a){return goog.userAgent.ASSUME_ANY_VERSION||goog.userAgent.isVersionOrHigherCache_[a]||(goog.userAgent.isVersionOrHigherCache_[a]=0<=goog.string.compareVersions(goog.userAgent.VERSION,a))};goog.userAgent.isVersion=goog.userAgent.isVersionOrHigher;
goog.userAgent.isDocumentModeOrHigher=function(a){return Number(goog.userAgent.DOCUMENT_MODE)>=a};goog.userAgent.isDocumentMode=goog.userAgent.isDocumentModeOrHigher;goog.userAgent.DOCUMENT_MODE=function(){var a=goog.global.document,b=goog.userAgent.getDocumentMode_();return a&&goog.userAgent.IE?b||("CSS1Compat"==a.compatMode?parseInt(goog.userAgent.VERSION,10):5):void 0}();goog.userAgent.product={};goog.userAgent.product.ASSUME_FIREFOX=!1;goog.userAgent.product.ASSUME_IPHONE=!1;goog.userAgent.product.ASSUME_IPAD=!1;goog.userAgent.product.ASSUME_ANDROID=!1;goog.userAgent.product.ASSUME_CHROME=!1;goog.userAgent.product.ASSUME_SAFARI=!1;
goog.userAgent.product.PRODUCT_KNOWN_=goog.userAgent.ASSUME_IE||goog.userAgent.ASSUME_EDGE||goog.userAgent.ASSUME_OPERA||goog.userAgent.product.ASSUME_FIREFOX||goog.userAgent.product.ASSUME_IPHONE||goog.userAgent.product.ASSUME_IPAD||goog.userAgent.product.ASSUME_ANDROID||goog.userAgent.product.ASSUME_CHROME||goog.userAgent.product.ASSUME_SAFARI;goog.userAgent.product.OPERA=goog.userAgent.OPERA;goog.userAgent.product.IE=goog.userAgent.IE;goog.userAgent.product.EDGE=goog.userAgent.EDGE;
goog.userAgent.product.FIREFOX=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_FIREFOX:goog.labs.userAgent.browser.isFirefox();goog.userAgent.product.isIphoneOrIpod_=function(){return goog.labs.userAgent.platform.isIphone()||goog.labs.userAgent.platform.isIpod()};goog.userAgent.product.IPHONE=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_IPHONE:goog.userAgent.product.isIphoneOrIpod_();
goog.userAgent.product.IPAD=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_IPAD:goog.labs.userAgent.platform.isIpad();goog.userAgent.product.ANDROID=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_ANDROID:goog.labs.userAgent.browser.isAndroidBrowser();goog.userAgent.product.CHROME=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_CHROME:goog.labs.userAgent.browser.isChrome();
goog.userAgent.product.isSafariDesktop_=function(){return goog.labs.userAgent.browser.isSafari()&&!goog.labs.userAgent.platform.isIos()};goog.userAgent.product.SAFARI=goog.userAgent.product.PRODUCT_KNOWN_?goog.userAgent.product.ASSUME_SAFARI:goog.userAgent.product.isSafariDesktop_();goog.crypt.base64={};goog.crypt.base64.byteToCharMap_=null;goog.crypt.base64.charToByteMap_=null;goog.crypt.base64.byteToCharMapWebSafe_=null;goog.crypt.base64.ENCODED_VALS_BASE="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";goog.crypt.base64.ENCODED_VALS=goog.crypt.base64.ENCODED_VALS_BASE+"+/=";goog.crypt.base64.ENCODED_VALS_WEBSAFE=goog.crypt.base64.ENCODED_VALS_BASE+"-_.";
goog.crypt.base64.ASSUME_NATIVE_SUPPORT_=goog.userAgent.GECKO||goog.userAgent.WEBKIT&&!goog.userAgent.product.SAFARI||goog.userAgent.OPERA;goog.crypt.base64.HAS_NATIVE_ENCODE_=goog.crypt.base64.ASSUME_NATIVE_SUPPORT_||"function"==typeof goog.global.btoa;goog.crypt.base64.HAS_NATIVE_DECODE_=goog.crypt.base64.ASSUME_NATIVE_SUPPORT_||!goog.userAgent.product.SAFARI&&!goog.userAgent.IE&&"function"==typeof goog.global.atob;
goog.crypt.base64.encodeByteArray=function(a,b){goog.asserts.assert(goog.isArrayLike(a),"encodeByteArray takes an array as a parameter");goog.crypt.base64.init_();for(var c=b?goog.crypt.base64.byteToCharMapWebSafe_:goog.crypt.base64.byteToCharMap_,d=[],e=0;e<a.length;e+=3){var f=a[e],g=e+1<a.length,h=g?a[e+1]:0,k=e+2<a.length,l=k?a[e+2]:0,p=f>>2,f=(f&3)<<4|h>>4,h=(h&15)<<2|l>>6,l=l&63;k||(l=64,g||(h=64));d.push(c[p],c[f],c[h],c[l])}return d.join("")};
goog.crypt.base64.encodeString=function(a,b){return goog.crypt.base64.HAS_NATIVE_ENCODE_&&!b?goog.global.btoa(a):goog.crypt.base64.encodeByteArray(goog.crypt.stringToByteArray(a),b)};goog.crypt.base64.decodeString=function(a,b){if(goog.crypt.base64.HAS_NATIVE_DECODE_&&!b)return goog.global.atob(a);var c="";goog.crypt.base64.decodeStringInternal_(a,function(a){c+=String.fromCharCode(a)});return c};
goog.crypt.base64.decodeStringToByteArray=function(a,b){var c=[];goog.crypt.base64.decodeStringInternal_(a,function(a){c.push(a)});return c};goog.crypt.base64.decodeStringToUint8Array=function(a){goog.asserts.assert(!goog.userAgent.IE||goog.userAgent.isVersionOrHigher("10"),"Browser does not support typed arrays");var b=new Uint8Array(Math.ceil(3*a.length/4)),c=0;goog.crypt.base64.decodeStringInternal_(a,function(a){b[c++]=a});return b.subarray(0,c)};
goog.crypt.base64.decodeStringInternal_=function(a,b){function c(b){for(;d<a.length;){var c=a.charAt(d++),e=goog.crypt.base64.charToByteMap_[c];if(null!=e)return e;if(!goog.string.isEmptyOrWhitespace(c))throw Error("Unknown base64 encoding at char: "+c);}return b}goog.crypt.base64.init_();for(var d=0;;){var e=c(-1),f=c(0),g=c(64),h=c(64);if(64===h&&-1===e)break;b(e<<2|f>>4);64!=g&&(b(f<<4&240|g>>2),64!=h&&b(g<<6&192|h))}};
goog.crypt.base64.init_=function(){if(!goog.crypt.base64.byteToCharMap_){goog.crypt.base64.byteToCharMap_={};goog.crypt.base64.charToByteMap_={};goog.crypt.base64.byteToCharMapWebSafe_={};for(var a=0;a<goog.crypt.base64.ENCODED_VALS.length;a++)goog.crypt.base64.byteToCharMap_[a]=goog.crypt.base64.ENCODED_VALS.charAt(a),goog.crypt.base64.charToByteMap_[goog.crypt.base64.byteToCharMap_[a]]=a,goog.crypt.base64.byteToCharMapWebSafe_[a]=goog.crypt.base64.ENCODED_VALS_WEBSAFE.charAt(a),a>=goog.crypt.base64.ENCODED_VALS_BASE.length&&
(goog.crypt.base64.charToByteMap_[goog.crypt.base64.ENCODED_VALS_WEBSAFE.charAt(a)]=a)}};jspb.ExtensionFieldInfo=function(a,b,c,d,e){this.fieldIndex=a;this.fieldName=b;this.ctor=c;this.toObjectFn=d;this.isRepeated=e};jspb.ExtensionFieldBinaryInfo=function(a,b,c,d,e,f){this.fieldInfo=a;this.binaryReaderFn=b;this.binaryWriterFn=c;this.binaryMessageSerializeFn=d;this.binaryMessageDeserializeFn=e;this.isPacked=f};jspb.ExtensionFieldInfo.prototype.isMessageType=function(){return!!this.ctor};jspb.Message=function(){};jspb.Message.GENERATE_TO_OBJECT=!0;jspb.Message.GENERATE_FROM_OBJECT=!goog.DISALLOW_TEST_ONLY_CODE;
jspb.Message.GENERATE_TO_STRING=!0;jspb.Message.ASSUME_LOCAL_ARRAYS=!1;jspb.Message.SERIALIZE_EMPTY_TRAILING_FIELDS=!0;jspb.Message.SUPPORTS_UINT8ARRAY_="function"==typeof Uint8Array;jspb.Message.prototype.getJsPbMessageId=function(){return this.messageId_};jspb.Message.getIndex_=function(a,b){return b+a.arrayIndexOffset_};jspb.Message.getFieldNumber_=function(a,b){return b-a.arrayIndexOffset_};
jspb.Message.initialize=function(a,b,c,d,e,f){a.wrappers_=null;b||(b=c?[c]:[]);a.messageId_=c?String(c):void 0;a.arrayIndexOffset_=0===c?-1:0;a.array=b;jspb.Message.initPivotAndExtensionObject_(a,d);a.convertedFloatingPointFields_={};jspb.Message.SERIALIZE_EMPTY_TRAILING_FIELDS||(a.repeatedFields=e);if(e)for(b=0;b<e.length;b++)c=e[b],c<a.pivot_?(c=jspb.Message.getIndex_(a,c),a.array[c]=a.array[c]||jspb.Message.EMPTY_LIST_SENTINEL_):(jspb.Message.maybeInitEmptyExtensionObject_(a),a.extensionObject_[c]=
a.extensionObject_[c]||jspb.Message.EMPTY_LIST_SENTINEL_);if(f&&f.length)for(b=0;b<f.length;b++)jspb.Message.computeOneofCase(a,f[b])};jspb.Message.EMPTY_LIST_SENTINEL_=goog.DEBUG&&Object.freeze?Object.freeze([]):[];jspb.Message.isArray_=function(a){return jspb.Message.ASSUME_LOCAL_ARRAYS?a instanceof Array:goog.isArray(a)};
jspb.Message.initPivotAndExtensionObject_=function(a,b){if(a.array.length){var c=a.array.length-1,d=a.array[c];if(d&&"object"==typeof d&&!jspb.Message.isArray_(d)&&!(jspb.Message.SUPPORTS_UINT8ARRAY_&&d instanceof Uint8Array)){a.pivot_=jspb.Message.getFieldNumber_(a,c);a.extensionObject_=d;return}}-1<b?(a.pivot_=b,a.extensionObject_=null):a.pivot_=Number.MAX_VALUE};
jspb.Message.maybeInitEmptyExtensionObject_=function(a){var b=jspb.Message.getIndex_(a,a.pivot_);a.array[b]||(a.extensionObject_=a.array[b]={})};jspb.Message.toObjectList=function(a,b,c){for(var d=[],e=0;e<a.length;e++)d[e]=b.call(a[e],c,a[e]);return d};
jspb.Message.toObjectExtension=function(a,b,c,d,e){for(var f in c){var g=c[f],h=d.call(a,g);if(null!=h){for(var k in g.fieldName)if(g.fieldName.hasOwnProperty(k))break;b[k]=g.toObjectFn?g.isRepeated?jspb.Message.toObjectList(h,g.toObjectFn,e):g.toObjectFn(e,h):h}}};
jspb.Message.serializeBinaryExtensions=function(a,b,c,d){for(var e in c){var f=c[e],g=f.fieldInfo;if(!f.binaryWriterFn)throw Error("Message extension present that was generated without binary serialization support");var h=d.call(a,g);if(null!=h)if(g.isMessageType())if(f.binaryMessageSerializeFn)f.binaryWriterFn.call(b,g.fieldIndex,h,f.binaryMessageSerializeFn);else throw Error("Message extension present holding submessage without binary support enabled, and message is being serialized to binary format");
else f.binaryWriterFn.call(b,g.fieldIndex,h)}};jspb.Message.readBinaryExtension=function(a,b,c,d,e){var f=c[b.getFieldNumber()];if(f){c=f.fieldInfo;if(!f.binaryReaderFn)throw Error("Deserializing extension whose generated code does not support binary format");var g;c.isMessageType()?(g=new c.ctor,f.binaryReaderFn.call(b,g,f.binaryMessageDeserializeFn)):g=f.binaryReaderFn.call(b);c.isRepeated&&!f.isPacked?(b=d.call(a,c))?b.push(g):e.call(a,c,[g]):e.call(a,c,g)}else b.skipField()};
jspb.Message.getField=function(a,b){if(b<a.pivot_){var c=jspb.Message.getIndex_(a,b),d=a.array[c];return d===jspb.Message.EMPTY_LIST_SENTINEL_?a.array[c]=[]:d}if(a.extensionObject_)return d=a.extensionObject_[b],d===jspb.Message.EMPTY_LIST_SENTINEL_?a.extensionObject_[b]=[]:d};
jspb.Message.getRepeatedField=function(a,b){if(b<a.pivot_){var c=jspb.Message.getIndex_(a,b),d=a.array[c];return d===jspb.Message.EMPTY_LIST_SENTINEL_?a.array[c]=[]:d}d=a.extensionObject_[b];return d===jspb.Message.EMPTY_LIST_SENTINEL_?a.extensionObject_[b]=[]:d};jspb.Message.getOptionalFloatingPointField=function(a,b){var c=jspb.Message.getField(a,b);return null==c?c:+c};
jspb.Message.getRepeatedFloatingPointField=function(a,b){var c=jspb.Message.getRepeatedField(a,b);a.convertedFloatingPointFields_||(a.convertedFloatingPointFields_={});if(!a.convertedFloatingPointFields_[b]){for(var d=0;d<c.length;d++)c[d]=+c[d];a.convertedFloatingPointFields_[b]=!0}return c};
jspb.Message.bytesAsB64=function(a){if(null==a||goog.isString(a))return a;if(jspb.Message.SUPPORTS_UINT8ARRAY_&&a instanceof Uint8Array)return goog.crypt.base64.encodeByteArray(a);goog.asserts.fail("Cannot coerce to b64 string: "+goog.typeOf(a));return null};jspb.Message.bytesAsU8=function(a){if(null==a||a instanceof Uint8Array)return a;if(goog.isString(a))return goog.crypt.base64.decodeStringToUint8Array(a);goog.asserts.fail("Cannot coerce to Uint8Array: "+goog.typeOf(a));return null};
jspb.Message.bytesListAsB64=function(a){jspb.Message.assertConsistentTypes_(a);return!a.length||goog.isString(a[0])?a:goog.array.map(a,jspb.Message.bytesAsB64)};jspb.Message.bytesListAsU8=function(a){jspb.Message.assertConsistentTypes_(a);return!a.length||a[0]instanceof Uint8Array?a:goog.array.map(a,jspb.Message.bytesAsU8)};
jspb.Message.assertConsistentTypes_=function(a){if(goog.DEBUG&&a&&1<a.length){var b=goog.typeOf(a[0]);goog.array.forEach(a,function(a){goog.typeOf(a)!=b&&goog.asserts.fail("Inconsistent type in JSPB repeated field array. Got "+goog.typeOf(a)+" expected "+b)})}};jspb.Message.getFieldWithDefault=function(a,b,c){a=jspb.Message.getField(a,b);return null==a?c:a};jspb.Message.getFieldProto3=jspb.Message.getFieldWithDefault;
jspb.Message.getMapField=function(a,b,c,d){a.wrappers_||(a.wrappers_={});if(b in a.wrappers_)return a.wrappers_[b];if(!c)return c=jspb.Message.getField(a,b),c||(c=[],jspb.Message.setField(a,b,c)),a.wrappers_[b]=new jspb.Map(c,d)};jspb.Message.setField=function(a,b,c){b<a.pivot_?a.array[jspb.Message.getIndex_(a,b)]=c:(jspb.Message.maybeInitEmptyExtensionObject_(a),a.extensionObject_[b]=c)};jspb.Message.setProto3IntField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,0)};
jspb.Message.setProto3StringIntField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,"0")};jspb.Message.setProto3FloatField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,0)};jspb.Message.setProto3BooleanField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,!1)};jspb.Message.setProto3StringField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,"")};jspb.Message.setProto3BytesField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,"")};
jspb.Message.setProto3EnumField=function(a,b,c){jspb.Message.setFieldIgnoringDefault_(a,b,c,0)};jspb.Message.setFieldIgnoringDefault_=function(a,b,c,d){c!=d?jspb.Message.setField(a,b,c):a.array[jspb.Message.getIndex_(a,b)]=null};jspb.Message.addToRepeatedField=function(a,b,c,d){a=jspb.Message.getRepeatedField(a,b);void 0!=d?a.splice(d,0,c):a.push(c)};
jspb.Message.setOneofField=function(a,b,c,d){(c=jspb.Message.computeOneofCase(a,c))&&c!==b&&void 0!==d&&(a.wrappers_&&c in a.wrappers_&&(a.wrappers_[c]=void 0),jspb.Message.setField(a,c,void 0));jspb.Message.setField(a,b,d)};jspb.Message.computeOneofCase=function(a,b){for(var c,d,e=0;e<b.length;e++){var f=b[e],g=jspb.Message.getField(a,f);null!=g&&(c=f,d=g,jspb.Message.setField(a,f,void 0))}return c?(jspb.Message.setField(a,c,d),c):0};
jspb.Message.getWrapperField=function(a,b,c,d){a.wrappers_||(a.wrappers_={});if(!a.wrappers_[c]){var e=jspb.Message.getField(a,c);if(d||e)a.wrappers_[c]=new b(e)}return a.wrappers_[c]};jspb.Message.getRepeatedWrapperField=function(a,b,c){jspb.Message.wrapRepeatedField_(a,b,c);b=a.wrappers_[c];b==jspb.Message.EMPTY_LIST_SENTINEL_&&(b=a.wrappers_[c]=[]);return b};
jspb.Message.wrapRepeatedField_=function(a,b,c){a.wrappers_||(a.wrappers_={});if(!a.wrappers_[c]){for(var d=jspb.Message.getRepeatedField(a,c),e=[],f=0;f<d.length;f++)e[f]=new b(d[f]);a.wrappers_[c]=e}};jspb.Message.setWrapperField=function(a,b,c){a.wrappers_||(a.wrappers_={});var d=c?c.toArray():c;a.wrappers_[b]=c;jspb.Message.setField(a,b,d)};
jspb.Message.setOneofWrapperField=function(a,b,c,d){a.wrappers_||(a.wrappers_={});var e=d?d.toArray():d;a.wrappers_[b]=d;jspb.Message.setOneofField(a,b,c,e)};jspb.Message.setRepeatedWrapperField=function(a,b,c){a.wrappers_||(a.wrappers_={});c=c||[];for(var d=[],e=0;e<c.length;e++)d[e]=c[e].toArray();a.wrappers_[b]=c;jspb.Message.setField(a,b,d)};
jspb.Message.addToRepeatedWrapperField=function(a,b,c,d,e){jspb.Message.wrapRepeatedField_(a,d,b);var f=a.wrappers_[b];f||(f=a.wrappers_[b]=[]);c=c?c:new d;a=jspb.Message.getRepeatedField(a,b);void 0!=e?(f.splice(e,0,c),a.splice(e,0,c.toArray())):(f.push(c),a.push(c.toArray()));return c};jspb.Message.toMap=function(a,b,c,d){for(var e={},f=0;f<a.length;f++)e[b.call(a[f])]=c?c.call(a[f],d,a[f]):a[f];return e};
jspb.Message.prototype.syncMapFields_=function(){if(this.wrappers_)for(var a in this.wrappers_){var b=this.wrappers_[a];if(goog.isArray(b))for(var c=0;c<b.length;c++)b[c]&&b[c].toArray();else b&&b.toArray()}};jspb.Message.prototype.toArray=function(){this.syncMapFields_();return this.array};jspb.Message.GENERATE_TO_STRING&&(jspb.Message.prototype.toString=function(){this.syncMapFields_();return this.array.toString()});
jspb.Message.prototype.getExtension=function(a){if(this.extensionObject_){this.wrappers_||(this.wrappers_={});var b=a.fieldIndex;if(a.isRepeated){if(a.isMessageType())return this.wrappers_[b]||(this.wrappers_[b]=goog.array.map(this.extensionObject_[b]||[],function(b){return new a.ctor(b)})),this.wrappers_[b]}else if(a.isMessageType())return!this.wrappers_[b]&&this.extensionObject_[b]&&(this.wrappers_[b]=new a.ctor(this.extensionObject_[b])),this.wrappers_[b];return this.extensionObject_[b]}};
jspb.Message.prototype.setExtension=function(a,b){this.wrappers_||(this.wrappers_={});jspb.Message.maybeInitEmptyExtensionObject_(this);var c=a.fieldIndex;a.isRepeated?(b=b||[],a.isMessageType()?(this.wrappers_[c]=b,this.extensionObject_[c]=goog.array.map(b,function(a){return a.toArray()})):this.extensionObject_[c]=b):a.isMessageType()?(this.wrappers_[c]=b,this.extensionObject_[c]=b?b.toArray():b):this.extensionObject_[c]=b;return this};
jspb.Message.difference=function(a,b){if(!(a instanceof b.constructor))throw Error("Messages have different types.");var c=a.toArray(),d=b.toArray(),e=[],f=0,g=c.length>d.length?c.length:d.length;a.getJsPbMessageId()&&(e[0]=a.getJsPbMessageId(),f=1);for(;f<g;f++)jspb.Message.compareFields(c[f],d[f])||(e[f]=d[f]);return new a.constructor(e)};jspb.Message.equals=function(a,b){return a==b||!(!a||!b)&&a instanceof b.constructor&&jspb.Message.compareFields(a.toArray(),b.toArray())};
jspb.Message.compareExtensions=function(a,b){a=a||{};b=b||{};var c={},d;for(d in a)c[d]=0;for(d in b)c[d]=0;for(d in c)if(!jspb.Message.compareFields(a[d],b[d]))return!1;return!0};
jspb.Message.compareFields=function(a,b){if(a==b)return!0;if(!goog.isObject(a)||!goog.isObject(b))return goog.isNumber(a)&&isNaN(a)||goog.isNumber(b)&&isNaN(b)?String(a)==String(b):!1;if(a.constructor!=b.constructor)return!1;if(jspb.Message.SUPPORTS_UINT8ARRAY_&&a.constructor===Uint8Array){if(a.length!=b.length)return!1;for(var c=0;c<a.length;c++)if(a[c]!=b[c])return!1;return!0}if(a.constructor===Array){for(var d=void 0,e=void 0,f=Math.max(a.length,b.length),c=0;c<f;c++){var g=a[c],h=b[c];g&&g.constructor==
Object&&(goog.asserts.assert(void 0===d),goog.asserts.assert(c===a.length-1),d=g,g=void 0);h&&h.constructor==Object&&(goog.asserts.assert(void 0===e),goog.asserts.assert(c===b.length-1),e=h,h=void 0);if(!jspb.Message.compareFields(g,h))return!1}return d||e?(d=d||{},e=e||{},jspb.Message.compareExtensions(d,e)):!0}if(a.constructor===Object)return jspb.Message.compareExtensions(a,b);throw Error("Invalid type in JSPB array");};jspb.Message.prototype.cloneMessage=function(){return jspb.Message.cloneMessage(this)};
jspb.Message.prototype.clone=function(){return jspb.Message.cloneMessage(this)};jspb.Message.clone=function(a){return jspb.Message.cloneMessage(a)};jspb.Message.cloneMessage=function(a){return new a.constructor(jspb.Message.clone_(a.toArray()))};
jspb.Message.copyInto=function(a,b){goog.asserts.assertInstanceof(a,jspb.Message);goog.asserts.assertInstanceof(b,jspb.Message);goog.asserts.assert(a.constructor==b.constructor,"Copy source and target message should have the same type.");for(var c=jspb.Message.clone(a),d=b.toArray(),e=c.toArray(),f=d.length=0;f<e.length;f++)d[f]=e[f];b.wrappers_=c.wrappers_;b.extensionObject_=c.extensionObject_};
jspb.Message.clone_=function(a){var b;if(goog.isArray(a)){for(var c=Array(a.length),d=0;d<a.length;d++)b=a[d],null!=b&&(c[d]="object"==typeof b?jspb.Message.clone_(goog.asserts.assert(b)):b);return c}if(jspb.Message.SUPPORTS_UINT8ARRAY_&&a instanceof Uint8Array)return new Uint8Array(a);c={};for(d in a)b=a[d],null!=b&&(c[d]="object"==typeof b?jspb.Message.clone_(goog.asserts.assert(b)):b);return c};jspb.Message.registerMessageType=function(a,b){jspb.Message.registry_[a]=b;b.messageId=a};
jspb.Message.registry_={};jspb.Message.messageSetExtensions={};jspb.Message.messageSetExtensionsBinary={};jspb.arith={};jspb.arith.UInt64=function(a,b){this.lo=a;this.hi=b};jspb.arith.UInt64.prototype.cmp=function(a){return this.hi<a.hi||this.hi==a.hi&&this.lo<a.lo?-1:this.hi==a.hi&&this.lo==a.lo?0:1};jspb.arith.UInt64.prototype.rightShift=function(){return new jspb.arith.UInt64((this.lo>>>1|(this.hi&1)<<31)>>>0,this.hi>>>1>>>0)};jspb.arith.UInt64.prototype.leftShift=function(){return new jspb.arith.UInt64(this.lo<<1>>>0,(this.hi<<1|this.lo>>>31)>>>0)};
jspb.arith.UInt64.prototype.msb=function(){return!!(this.hi&2147483648)};jspb.arith.UInt64.prototype.lsb=function(){return!!(this.lo&1)};jspb.arith.UInt64.prototype.zero=function(){return 0==this.lo&&0==this.hi};jspb.arith.UInt64.prototype.add=function(a){return new jspb.arith.UInt64((this.lo+a.lo&4294967295)>>>0>>>0,((this.hi+a.hi&4294967295)>>>0)+(4294967296<=this.lo+a.lo?1:0)>>>0)};
jspb.arith.UInt64.prototype.sub=function(a){return new jspb.arith.UInt64((this.lo-a.lo&4294967295)>>>0>>>0,((this.hi-a.hi&4294967295)>>>0)-(0>this.lo-a.lo?1:0)>>>0)};jspb.arith.UInt64.mul32x32=function(a,b){for(var c=a&65535,d=a>>>16,e=b&65535,f=b>>>16,g=c*e+65536*(c*f&65535)+65536*(d*e&65535),c=d*f+(c*f>>>16)+(d*e>>>16);4294967296<=g;)g-=4294967296,c+=1;return new jspb.arith.UInt64(g>>>0,c>>>0)};
jspb.arith.UInt64.prototype.mul=function(a){var b=jspb.arith.UInt64.mul32x32(this.lo,a);a=jspb.arith.UInt64.mul32x32(this.hi,a);a.hi=a.lo;a.lo=0;return b.add(a)};
jspb.arith.UInt64.prototype.div=function(a){if(0==a)return[];var b=new jspb.arith.UInt64(0,0),c=new jspb.arith.UInt64(this.lo,this.hi);a=new jspb.arith.UInt64(a,0);for(var d=new jspb.arith.UInt64(1,0);!a.msb();)a=a.leftShift(),d=d.leftShift();for(;!d.zero();)0>=a.cmp(c)&&(b=b.add(d),c=c.sub(a)),a=a.rightShift(),d=d.rightShift();return[b,c]};jspb.arith.UInt64.prototype.toString=function(){for(var a="",b=this;!b.zero();)var b=b.div(10),c=b[0],a=b[1].lo+a,b=c;""==a&&(a="0");return a};
jspb.arith.UInt64.fromString=function(a){for(var b=new jspb.arith.UInt64(0,0),c=new jspb.arith.UInt64(0,0),d=0;d<a.length;d++){if("0">a[d]||"9"<a[d])return null;var e=parseInt(a[d],10);c.lo=e;b=b.mul(10).add(c)}return b};jspb.arith.UInt64.prototype.clone=function(){return new jspb.arith.UInt64(this.lo,this.hi)};jspb.arith.Int64=function(a,b){this.lo=a;this.hi=b};
jspb.arith.Int64.prototype.add=function(a){return new jspb.arith.Int64((this.lo+a.lo&4294967295)>>>0>>>0,((this.hi+a.hi&4294967295)>>>0)+(4294967296<=this.lo+a.lo?1:0)>>>0)};jspb.arith.Int64.prototype.sub=function(a){return new jspb.arith.Int64((this.lo-a.lo&4294967295)>>>0>>>0,((this.hi-a.hi&4294967295)>>>0)-(0>this.lo-a.lo?1:0)>>>0)};jspb.arith.Int64.prototype.clone=function(){return new jspb.arith.Int64(this.lo,this.hi)};
jspb.arith.Int64.prototype.toString=function(){var a=0!=(this.hi&2147483648),b=new jspb.arith.UInt64(this.lo,this.hi);a&&(b=(new jspb.arith.UInt64(0,0)).sub(b));return(a?"-":"")+b.toString()};jspb.arith.Int64.fromString=function(a){var b=0<a.length&&"-"==a[0];b&&(a=a.substring(1));a=jspb.arith.UInt64.fromString(a);if(null===a)return null;b&&(a=(new jspb.arith.UInt64(0,0)).sub(a));return new jspb.arith.Int64(a.lo,a.hi)};jspb.BinaryConstants={};jspb.ConstBinaryMessage=function(){};jspb.BinaryMessage=function(){};jspb.BinaryConstants.FieldType={INVALID:-1,DOUBLE:1,FLOAT:2,INT64:3,UINT64:4,INT32:5,FIXED64:6,FIXED32:7,BOOL:8,STRING:9,GROUP:10,MESSAGE:11,BYTES:12,UINT32:13,ENUM:14,SFIXED32:15,SFIXED64:16,SINT32:17,SINT64:18,FHASH64:30,VHASH64:31};jspb.BinaryConstants.WireType={INVALID:-1,VARINT:0,FIXED64:1,DELIMITED:2,START_GROUP:3,END_GROUP:4,FIXED32:5};
jspb.BinaryConstants.FieldTypeToWireType=function(a){var b=jspb.BinaryConstants.FieldType,c=jspb.BinaryConstants.WireType;switch(a){case b.INT32:case b.INT64:case b.UINT32:case b.UINT64:case b.SINT32:case b.SINT64:case b.BOOL:case b.ENUM:case b.VHASH64:return c.VARINT;case b.DOUBLE:case b.FIXED64:case b.SFIXED64:case b.FHASH64:return c.FIXED64;case b.STRING:case b.MESSAGE:case b.BYTES:return c.DELIMITED;case b.FLOAT:case b.FIXED32:case b.SFIXED32:return c.FIXED32;default:return c.INVALID}};
jspb.BinaryConstants.INVALID_FIELD_NUMBER=-1;jspb.BinaryConstants.FLOAT32_EPS=1.401298464324817E-45;jspb.BinaryConstants.FLOAT32_MIN=1.1754943508222875E-38;jspb.BinaryConstants.FLOAT32_MAX=3.4028234663852886E38;jspb.BinaryConstants.FLOAT64_EPS=4.9E-324;jspb.BinaryConstants.FLOAT64_MIN=2.2250738585072014E-308;jspb.BinaryConstants.FLOAT64_MAX=1.7976931348623157E308;jspb.BinaryConstants.TWO_TO_20=1048576;jspb.BinaryConstants.TWO_TO_23=8388608;jspb.BinaryConstants.TWO_TO_31=2147483648;
jspb.BinaryConstants.TWO_TO_32=4294967296;jspb.BinaryConstants.TWO_TO_52=4503599627370496;jspb.BinaryConstants.TWO_TO_63=0x7fffffffffffffff;jspb.BinaryConstants.TWO_TO_64=1.8446744073709552E19;jspb.BinaryConstants.ZERO_HASH="\x00\x00\x00\x00\x00\x00\x00\x00";jspb.utils={};jspb.utils.split64Low=0;jspb.utils.split64High=0;jspb.utils.splitUint64=function(a){var b=a>>>0;a=Math.floor((a-b)/jspb.BinaryConstants.TWO_TO_32)>>>0;jspb.utils.split64Low=b;jspb.utils.split64High=a};jspb.utils.splitInt64=function(a){var b=0>a;a=Math.abs(a);var c=a>>>0;a=Math.floor((a-c)/jspb.BinaryConstants.TWO_TO_32);a>>>=0;b&&(a=~a>>>0,c=(~c>>>0)+1,4294967295<c&&(c=0,a++,4294967295<a&&(a=0)));jspb.utils.split64Low=c;jspb.utils.split64High=a};
jspb.utils.splitZigzag64=function(a){var b=0>a;a=2*Math.abs(a);jspb.utils.splitUint64(a);a=jspb.utils.split64Low;var c=jspb.utils.split64High;b&&(0==a?0==c?c=a=4294967295:(c--,a=4294967295):a--);jspb.utils.split64Low=a;jspb.utils.split64High=c};
jspb.utils.splitFloat32=function(a){var b=0>a?1:0;a=b?-a:a;var c;0===a?0<1/a?(jspb.utils.split64High=0,jspb.utils.split64Low=0):(jspb.utils.split64High=0,jspb.utils.split64Low=2147483648):isNaN(a)?(jspb.utils.split64High=0,jspb.utils.split64Low=2147483647):a>jspb.BinaryConstants.FLOAT32_MAX?(jspb.utils.split64High=0,jspb.utils.split64Low=(b<<31|2139095040)>>>0):a<jspb.BinaryConstants.FLOAT32_MIN?(a=Math.round(a/Math.pow(2,-149)),jspb.utils.split64High=0,jspb.utils.split64Low=(b<<31|a)>>>0):(c=Math.floor(Math.log(a)/
Math.LN2),a*=Math.pow(2,-c),a=Math.round(a*jspb.BinaryConstants.TWO_TO_23)&8388607,jspb.utils.split64High=0,jspb.utils.split64Low=(b<<31|c+127<<23|a)>>>0)};
jspb.utils.splitFloat64=function(a){var b=0>a?1:0;a=b?-a:a;if(0===a)jspb.utils.split64High=0<1/a?0:2147483648,jspb.utils.split64Low=0;else if(isNaN(a))jspb.utils.split64High=2147483647,jspb.utils.split64Low=4294967295;else if(a>jspb.BinaryConstants.FLOAT64_MAX)jspb.utils.split64High=(b<<31|2146435072)>>>0,jspb.utils.split64Low=0;else if(a<jspb.BinaryConstants.FLOAT64_MIN){var c=a/Math.pow(2,-1074);a=c/jspb.BinaryConstants.TWO_TO_32;jspb.utils.split64High=(b<<31|a)>>>0;jspb.utils.split64Low=c>>>0}else{var d=
Math.floor(Math.log(a)/Math.LN2);1024==d&&(d=1023);c=a*Math.pow(2,-d);a=c*jspb.BinaryConstants.TWO_TO_20&1048575;c=c*jspb.BinaryConstants.TWO_TO_52>>>0;jspb.utils.split64High=(b<<31|d+1023<<20|a)>>>0;jspb.utils.split64Low=c}};
jspb.utils.splitHash64=function(a){var b=a.charCodeAt(0),c=a.charCodeAt(1),d=a.charCodeAt(2),e=a.charCodeAt(3),f=a.charCodeAt(4),g=a.charCodeAt(5),h=a.charCodeAt(6);a=a.charCodeAt(7);jspb.utils.split64Low=b+(c<<8)+(d<<16)+(e<<24)>>>0;jspb.utils.split64High=f+(g<<8)+(h<<16)+(a<<24)>>>0};jspb.utils.joinUint64=function(a,b){return b*jspb.BinaryConstants.TWO_TO_32+a};
jspb.utils.joinInt64=function(a,b){var c=b&2147483648;c&&(a=~a+1>>>0,b=~b>>>0,0==a&&(b=b+1>>>0));var d=jspb.utils.joinUint64(a,b);return c?-d:d};jspb.utils.joinZigzag64=function(a,b){var c=a&1;a=(a>>>1|b<<31)>>>0;b>>>=1;c&&(a=a+1>>>0,0==a&&(b=b+1>>>0));var d=jspb.utils.joinUint64(a,b);return c?-d:d};jspb.utils.joinFloat32=function(a,b){var c=2*(a>>31)+1,d=a>>>23&255,e=a&8388607;return 255==d?e?NaN:Infinity*c:0==d?c*Math.pow(2,-149)*e:c*Math.pow(2,d-150)*(e+Math.pow(2,23))};
jspb.utils.joinFloat64=function(a,b){var c=2*(b>>31)+1,d=b>>>20&2047,e=jspb.BinaryConstants.TWO_TO_32*(b&1048575)+a;return 2047==d?e?NaN:Infinity*c:0==d?c*Math.pow(2,-1074)*e:c*Math.pow(2,d-1075)*(e+jspb.BinaryConstants.TWO_TO_52)};jspb.utils.joinHash64=function(a,b){return String.fromCharCode(a>>>0&255,a>>>8&255,a>>>16&255,a>>>24&255,b>>>0&255,b>>>8&255,b>>>16&255,b>>>24&255)};jspb.utils.DIGITS="0123456789abcdef".split("");
jspb.utils.joinUnsignedDecimalString=function(a,b){function c(a){for(var b=1E7,c=0;7>c;c++){var b=b/10,d=a/b%10>>>0;if(0!=d||h)h=!0,k+=g[d]}}if(2097151>=b)return""+(jspb.BinaryConstants.TWO_TO_32*b+a);var d=(a>>>24|b<<8)>>>0&16777215,e=b>>16&65535,f=(a&16777215)+6777216*d+6710656*e,d=d+8147497*e,e=2*e;1E7<=f&&(d+=Math.floor(f/1E7),f%=1E7);1E7<=d&&(e+=Math.floor(d/1E7),d%=1E7);var g=jspb.utils.DIGITS,h=!1,k="";(e||h)&&c(e);(d||h)&&c(d);(f||h)&&c(f);return k};
jspb.utils.joinSignedDecimalString=function(a,b){var c=b&2147483648;c&&(a=~a+1>>>0,b=~b+(0==a?1:0)>>>0);var d=jspb.utils.joinUnsignedDecimalString(a,b);return c?"-"+d:d};jspb.utils.hash64ToDecimalString=function(a,b){jspb.utils.splitHash64(a);var c=jspb.utils.split64Low,d=jspb.utils.split64High;return b?jspb.utils.joinSignedDecimalString(c,d):jspb.utils.joinUnsignedDecimalString(c,d)};
jspb.utils.hash64ArrayToDecimalStrings=function(a,b){for(var c=Array(a.length),d=0;d<a.length;d++)c[d]=jspb.utils.hash64ToDecimalString(a[d],b);return c};
jspb.utils.decimalStringToHash64=function(a){function b(a,b){for(var c=0;8>c&&(1!==a||0<b);c++){var d=a*e[c]+b;e[c]=d&255;b=d>>>8}}function c(){for(var a=0;8>a;a++)e[a]=~e[a]&255}goog.asserts.assert(0<a.length);var d=!1;"-"===a[0]&&(d=!0,a=a.slice(1));for(var e=[0,0,0,0,0,0,0,0],f=0;f<a.length;f++)b(10,jspb.utils.DIGITS.indexOf(a[f]));d&&(c(),b(1,1));return goog.crypt.byteArrayToString(e)};jspb.utils.splitDecimalString=function(a){jspb.utils.splitHash64(jspb.utils.decimalStringToHash64(a))};
jspb.utils.hash64ToHexString=function(a){var b=Array(18);b[0]="0";b[1]="x";for(var c=0;8>c;c++){var d=a.charCodeAt(7-c);b[2*c+2]=jspb.utils.DIGITS[d>>4];b[2*c+3]=jspb.utils.DIGITS[d&15]}return b.join("")};jspb.utils.hexStringToHash64=function(a){a=a.toLowerCase();goog.asserts.assert(18==a.length);goog.asserts.assert("0"==a[0]);goog.asserts.assert("x"==a[1]);for(var b="",c=0;8>c;c++)var d=jspb.utils.DIGITS.indexOf(a[2*c+2]),e=jspb.utils.DIGITS.indexOf(a[2*c+3]),b=String.fromCharCode(16*d+e)+b;return b};
jspb.utils.hash64ToNumber=function(a,b){jspb.utils.splitHash64(a);var c=jspb.utils.split64Low,d=jspb.utils.split64High;return b?jspb.utils.joinInt64(c,d):jspb.utils.joinUint64(c,d)};jspb.utils.numberToHash64=function(a){jspb.utils.splitInt64(a);return jspb.utils.joinHash64(jspb.utils.split64Low,jspb.utils.split64High)};jspb.utils.countVarints=function(a,b,c){for(var d=0,e=b;e<c;e++)d+=a[e]>>7;return c-b-d};
jspb.utils.countVarintFields=function(a,b,c,d){var e=0;d=8*d+jspb.BinaryConstants.WireType.VARINT;if(128>d)for(;b<c&&a[b++]==d;)for(e++;;){var f=a[b++];if(0==(f&128))break}else for(;b<c;){for(f=d;128<f;){if(a[b]!=(f&127|128))return e;b++;f>>=7}if(a[b++]!=f)break;for(e++;f=a[b++],0!=(f&128););}return e};jspb.utils.countFixedFields_=function(a,b,c,d,e){var f=0;if(128>d)for(;b<c&&a[b++]==d;)f++,b+=e;else for(;b<c;){for(var g=d;128<g;){if(a[b++]!=(g&127|128))return f;g>>=7}if(a[b++]!=g)break;f++;b+=e}return f};
jspb.utils.countFixed32Fields=function(a,b,c,d){return jspb.utils.countFixedFields_(a,b,c,8*d+jspb.BinaryConstants.WireType.FIXED32,4)};jspb.utils.countFixed64Fields=function(a,b,c,d){return jspb.utils.countFixedFields_(a,b,c,8*d+jspb.BinaryConstants.WireType.FIXED64,8)};
jspb.utils.countDelimitedFields=function(a,b,c,d){var e=0;for(d=8*d+jspb.BinaryConstants.WireType.DELIMITED;b<c;){for(var f=d;128<f;){if(a[b++]!=(f&127|128))return e;f>>=7}if(a[b++]!=f)break;e++;for(var g=0,h=1;f=a[b++],g+=(f&127)*h,h*=128,0!=(f&128););b+=g}return e};jspb.utils.debugBytesToTextFormat=function(a){var b='"';if(a){a=jspb.utils.byteSourceToUint8Array(a);for(var c=0;c<a.length;c++)b+="\\x",16>a[c]&&(b+="0"),b+=a[c].toString(16)}return b+'"'};
jspb.utils.debugScalarToTextFormat=function(a){return goog.isString(a)?goog.string.quote(a):a.toString()};jspb.utils.stringToByteArray=function(a){for(var b=new Uint8Array(a.length),c=0;c<a.length;c++){var d=a.charCodeAt(c);if(255<d)throw Error("Conversion error: string contains codepoint outside of byte range");b[c]=d}return b};
jspb.utils.byteSourceToUint8Array=function(a){if(a.constructor===Uint8Array)return a;if(a.constructor===ArrayBuffer||a.constructor===Buffer||a.constructor===Array)return new Uint8Array(a);if(a.constructor===String)return goog.crypt.base64.decodeStringToUint8Array(a);goog.asserts.fail("Type not convertible to Uint8Array.");return new Uint8Array(0)};jspb.BinaryEncoder=function(){this.buffer_=[]};jspb.BinaryEncoder.prototype.length=function(){return this.buffer_.length};jspb.BinaryEncoder.prototype.end=function(){var a=this.buffer_;this.buffer_=[];return a};
jspb.BinaryEncoder.prototype.writeSplitVarint64=function(a,b){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(b==Math.floor(b));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);for(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32);0<b||127<a;)this.buffer_.push(a&127|128),a=(a>>>7|b<<25)>>>0,b>>>=7;this.buffer_.push(a)};
jspb.BinaryEncoder.prototype.writeSplitFixed64=function(a,b){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(b==Math.floor(b));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32);this.writeUint32(a);this.writeUint32(b)};
jspb.BinaryEncoder.prototype.writeUnsignedVarint32=function(a){goog.asserts.assert(a==Math.floor(a));for(goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);127<a;)this.buffer_.push(a&127|128),a>>>=7;this.buffer_.push(a)};
jspb.BinaryEncoder.prototype.writeSignedVarint32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);if(0<=a)this.writeUnsignedVarint32(a);else{for(var b=0;9>b;b++)this.buffer_.push(a&127|128),a>>=7;this.buffer_.push(1)}};
jspb.BinaryEncoder.prototype.writeUnsignedVarint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_64);jspb.utils.splitInt64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeSignedVarint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitInt64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeZigzagVarint32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);this.writeUnsignedVarint32((a<<1^a>>31)>>>0)};jspb.BinaryEncoder.prototype.writeZigzagVarint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitZigzag64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeZigzagVarint64String=function(a){this.writeZigzagVarint64(parseInt(a,10))};jspb.BinaryEncoder.prototype.writeUint8=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&256>a);this.buffer_.push(a>>>0&255)};jspb.BinaryEncoder.prototype.writeUint16=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&65536>a);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255)};
jspb.BinaryEncoder.prototype.writeUint32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_32);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255);this.buffer_.push(a>>>16&255);this.buffer_.push(a>>>24&255)};jspb.BinaryEncoder.prototype.writeUint64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(0<=a&&a<jspb.BinaryConstants.TWO_TO_64);jspb.utils.splitUint64(a);this.writeUint32(jspb.utils.split64Low);this.writeUint32(jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeInt8=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(-128<=a&&128>a);this.buffer_.push(a>>>0&255)};jspb.BinaryEncoder.prototype.writeInt16=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(-32768<=a&&32768>a);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255)};
jspb.BinaryEncoder.prototype.writeInt32=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);this.buffer_.push(a>>>0&255);this.buffer_.push(a>>>8&255);this.buffer_.push(a>>>16&255);this.buffer_.push(a>>>24&255)};
jspb.BinaryEncoder.prototype.writeInt64=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_63&&a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitInt64(a);this.writeSplitFixed64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeInt64String=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(+a>=-jspb.BinaryConstants.TWO_TO_63&&+a<jspb.BinaryConstants.TWO_TO_63);jspb.utils.splitHash64(jspb.utils.decimalStringToHash64(a));this.writeSplitFixed64(jspb.utils.split64Low,jspb.utils.split64High)};jspb.BinaryEncoder.prototype.writeFloat=function(a){goog.asserts.assert(a>=-jspb.BinaryConstants.FLOAT32_MAX&&a<=jspb.BinaryConstants.FLOAT32_MAX);jspb.utils.splitFloat32(a);this.writeUint32(jspb.utils.split64Low)};
jspb.BinaryEncoder.prototype.writeDouble=function(a){goog.asserts.assert(a>=-jspb.BinaryConstants.FLOAT64_MAX&&a<=jspb.BinaryConstants.FLOAT64_MAX);jspb.utils.splitFloat64(a);this.writeUint32(jspb.utils.split64Low);this.writeUint32(jspb.utils.split64High)};jspb.BinaryEncoder.prototype.writeBool=function(a){goog.asserts.assert(goog.isBoolean(a)||goog.isNumber(a));this.buffer_.push(a?1:0)};
jspb.BinaryEncoder.prototype.writeEnum=function(a){goog.asserts.assert(a==Math.floor(a));goog.asserts.assert(a>=-jspb.BinaryConstants.TWO_TO_31&&a<jspb.BinaryConstants.TWO_TO_31);this.writeSignedVarint32(a)};jspb.BinaryEncoder.prototype.writeBytes=function(a){this.buffer_.push.apply(this.buffer_,a)};jspb.BinaryEncoder.prototype.writeVarintHash64=function(a){jspb.utils.splitHash64(a);this.writeSplitVarint64(jspb.utils.split64Low,jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeFixedHash64=function(a){jspb.utils.splitHash64(a);this.writeUint32(jspb.utils.split64Low);this.writeUint32(jspb.utils.split64High)};
jspb.BinaryEncoder.prototype.writeString=function(a){for(var b=this.buffer_.length,c=0;c<a.length;c++){var d=a.charCodeAt(c);if(128>d)this.buffer_.push(d);else if(2048>d)this.buffer_.push(d>>6|192),this.buffer_.push(d&63|128);else if(65536>d)if(55296<=d&&56319>=d&&c+1<a.length){var e=a.charCodeAt(c+1);56320<=e&&57343>=e&&(d=1024*(d-55296)+e-56320+65536,this.buffer_.push(d>>18|240),this.buffer_.push(d>>12&63|128),this.buffer_.push(d>>6&63|128),this.buffer_.push(d&63|128),c++)}else this.buffer_.push(d>>
12|224),this.buffer_.push(d>>6&63|128),this.buffer_.push(d&63|128)}return this.buffer_.length-b};jspb.BinaryWriter=function(){this.blocks_=[];this.totalLength_=0;this.encoder_=new jspb.BinaryEncoder;this.bookmarks_=[]};jspb.BinaryWriter.prototype.appendUint8Array_=function(a){var b=this.encoder_.end();this.blocks_.push(b);this.blocks_.push(a);this.totalLength_+=b.length+a.length};
jspb.BinaryWriter.prototype.beginDelimited_=function(a){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);a=this.encoder_.end();this.blocks_.push(a);this.totalLength_+=a.length;a.push(this.totalLength_);return a};jspb.BinaryWriter.prototype.endDelimited_=function(a){var b=a.pop(),b=this.totalLength_+this.encoder_.length()-b;for(goog.asserts.assert(0<=b);127<b;)a.push(b&127|128),b>>>=7,this.totalLength_++;a.push(b);this.totalLength_++};
jspb.BinaryWriter.prototype.writeSerializedMessage=function(a,b,c){this.appendUint8Array_(a.subarray(b,c))};jspb.BinaryWriter.prototype.maybeWriteSerializedMessage=function(a,b,c){null!=a&&null!=b&&null!=c&&this.writeSerializedMessage(a,b,c)};jspb.BinaryWriter.prototype.reset=function(){this.blocks_=[];this.encoder_.end();this.totalLength_=0;this.bookmarks_=[]};
jspb.BinaryWriter.prototype.getResultBuffer=function(){goog.asserts.assert(0==this.bookmarks_.length);for(var a=new Uint8Array(this.totalLength_+this.encoder_.length()),b=this.blocks_,c=b.length,d=0,e=0;e<c;e++){var f=b[e];a.set(f,d);d+=f.length}b=this.encoder_.end();a.set(b,d);d+=b.length;goog.asserts.assert(d==a.length);this.blocks_=[a];return a};jspb.BinaryWriter.prototype.getResultBase64String=function(a){return goog.crypt.base64.encodeByteArray(this.getResultBuffer(),a)};
jspb.BinaryWriter.prototype.beginSubMessage=function(a){this.bookmarks_.push(this.beginDelimited_(a))};jspb.BinaryWriter.prototype.endSubMessage=function(){goog.asserts.assert(0<=this.bookmarks_.length);this.endDelimited_(this.bookmarks_.pop())};jspb.BinaryWriter.prototype.writeFieldHeader_=function(a,b){goog.asserts.assert(1<=a&&a==Math.floor(a));this.encoder_.writeUnsignedVarint32(8*a+b)};
jspb.BinaryWriter.prototype.writeAny=function(a,b,c){var d=jspb.BinaryConstants.FieldType;switch(a){case d.DOUBLE:this.writeDouble(b,c);break;case d.FLOAT:this.writeFloat(b,c);break;case d.INT64:this.writeInt64(b,c);break;case d.UINT64:this.writeUint64(b,c);break;case d.INT32:this.writeInt32(b,c);break;case d.FIXED64:this.writeFixed64(b,c);break;case d.FIXED32:this.writeFixed32(b,c);break;case d.BOOL:this.writeBool(b,c);break;case d.STRING:this.writeString(b,c);break;case d.GROUP:goog.asserts.fail("Group field type not supported in writeAny()");
break;case d.MESSAGE:goog.asserts.fail("Message field type not supported in writeAny()");break;case d.BYTES:this.writeBytes(b,c);break;case d.UINT32:this.writeUint32(b,c);break;case d.ENUM:this.writeEnum(b,c);break;case d.SFIXED32:this.writeSfixed32(b,c);break;case d.SFIXED64:this.writeSfixed64(b,c);break;case d.SINT32:this.writeSint32(b,c);break;case d.SINT64:this.writeSint64(b,c);break;case d.FHASH64:this.writeFixedHash64(b,c);break;case d.VHASH64:this.writeVarintHash64(b,c);break;default:goog.asserts.fail("Invalid field type in writeAny()")}};
jspb.BinaryWriter.prototype.writeUnsignedVarint32_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeUnsignedVarint32(b))};jspb.BinaryWriter.prototype.writeSignedVarint32_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeSignedVarint32(b))};jspb.BinaryWriter.prototype.writeUnsignedVarint64_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeUnsignedVarint64(b))};
jspb.BinaryWriter.prototype.writeSignedVarint64_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeSignedVarint64(b))};jspb.BinaryWriter.prototype.writeZigzagVarint32_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeZigzagVarint32(b))};jspb.BinaryWriter.prototype.writeZigzagVarint64_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeZigzagVarint64(b))};
jspb.BinaryWriter.prototype.writeZigzagVarint64String_=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeZigzagVarint64String(b))};jspb.BinaryWriter.prototype.writeInt32=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeSignedVarint32_(a,b))};
jspb.BinaryWriter.prototype.writeInt32String=function(a,b){if(null!=b){var c=parseInt(b,10);goog.asserts.assert(c>=-jspb.BinaryConstants.TWO_TO_31&&c<jspb.BinaryConstants.TWO_TO_31);this.writeSignedVarint32_(a,c)}};jspb.BinaryWriter.prototype.writeInt64=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeSignedVarint64_(a,b))};
jspb.BinaryWriter.prototype.writeInt64String=function(a,b){if(null!=b){var c=jspb.arith.Int64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT);this.encoder_.writeSplitVarint64(c.lo,c.hi)}};jspb.BinaryWriter.prototype.writeUint32=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32),this.writeUnsignedVarint32_(a,b))};
jspb.BinaryWriter.prototype.writeUint32String=function(a,b){if(null!=b){var c=parseInt(b,10);goog.asserts.assert(0<=c&&c<jspb.BinaryConstants.TWO_TO_32);this.writeUnsignedVarint32_(a,c)}};jspb.BinaryWriter.prototype.writeUint64=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_64),this.writeUnsignedVarint64_(a,b))};
jspb.BinaryWriter.prototype.writeUint64String=function(a,b){if(null!=b){var c=jspb.arith.UInt64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT);this.encoder_.writeSplitVarint64(c.lo,c.hi)}};jspb.BinaryWriter.prototype.writeSint32=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeZigzagVarint32_(a,b))};
jspb.BinaryWriter.prototype.writeSint64=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeZigzagVarint64_(a,b))};jspb.BinaryWriter.prototype.writeSint64String=function(a,b){null!=b&&(goog.asserts.assert(+b>=-jspb.BinaryConstants.TWO_TO_63&&+b<jspb.BinaryConstants.TWO_TO_63),this.writeZigzagVarint64String_(a,b))};
jspb.BinaryWriter.prototype.writeFixed32=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_32),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED32),this.encoder_.writeUint32(b))};jspb.BinaryWriter.prototype.writeFixed64=function(a,b){null!=b&&(goog.asserts.assert(0<=b&&b<jspb.BinaryConstants.TWO_TO_64),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeUint64(b))};
jspb.BinaryWriter.prototype.writeFixed64String=function(a,b){if(null!=b){var c=jspb.arith.UInt64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64);this.encoder_.writeSplitFixed64(c.lo,c.hi)}};jspb.BinaryWriter.prototype.writeSfixed32=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED32),this.encoder_.writeInt32(b))};
jspb.BinaryWriter.prototype.writeSfixed64=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_63&&b<jspb.BinaryConstants.TWO_TO_63),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeInt64(b))};jspb.BinaryWriter.prototype.writeSfixed64String=function(a,b){if(null!=b){var c=jspb.arith.Int64.fromString(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64);this.encoder_.writeSplitFixed64(c.lo,c.hi)}};
jspb.BinaryWriter.prototype.writeFloat=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED32),this.encoder_.writeFloat(b))};jspb.BinaryWriter.prototype.writeDouble=function(a,b){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeDouble(b))};jspb.BinaryWriter.prototype.writeBool=function(a,b){null!=b&&(goog.asserts.assert(goog.isBoolean(b)||goog.isNumber(b)),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeBool(b))};
jspb.BinaryWriter.prototype.writeEnum=function(a,b){null!=b&&(goog.asserts.assert(b>=-jspb.BinaryConstants.TWO_TO_31&&b<jspb.BinaryConstants.TWO_TO_31),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeSignedVarint32(b))};jspb.BinaryWriter.prototype.writeString=function(a,b){if(null!=b){var c=this.beginDelimited_(a);this.encoder_.writeString(b);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writeBytes=function(a,b){if(null!=b){var c=jspb.utils.byteSourceToUint8Array(b);this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(c.length);this.appendUint8Array_(c)}};jspb.BinaryWriter.prototype.writeMessage=function(a,b,c){null!=b&&(a=this.beginDelimited_(a),c(b,this),this.endDelimited_(a))};
jspb.BinaryWriter.prototype.writeGroup=function(a,b,c){null!=b&&(this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.START_GROUP),c(b,this),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.END_GROUP))};jspb.BinaryWriter.prototype.writeFixedHash64=function(a,b){null!=b&&(goog.asserts.assert(8==b.length),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.FIXED64),this.encoder_.writeFixedHash64(b))};
jspb.BinaryWriter.prototype.writeVarintHash64=function(a,b){null!=b&&(goog.asserts.assert(8==b.length),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.VARINT),this.encoder_.writeVarintHash64(b))};jspb.BinaryWriter.prototype.writeRepeatedInt32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSignedVarint32_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedInt32String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeInt32String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedInt64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSignedVarint64_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedInt64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeInt64String(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedUint32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUnsignedVarint32_(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedUint32String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUint32String(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedUint64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUnsignedVarint64_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedUint64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeUint64String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedSint32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeZigzagVarint32_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSint64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeZigzagVarint64_(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSint64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeZigzagVarint64String_(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedFixed32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixed32(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedFixed64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixed64(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedFixed64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixed64String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedSfixed32=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSfixed32(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSfixed64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSfixed64(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedSfixed64String=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeSfixed64String(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedFloat=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFloat(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedDouble=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeDouble(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedBool=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeBool(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedEnum=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeEnum(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedString=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeString(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedBytes=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeBytes(a,b[c])};jspb.BinaryWriter.prototype.writeRepeatedMessage=function(a,b,c){if(null!=b)for(var d=0;d<b.length;d++){var e=this.beginDelimited_(a);c(b[d],this);this.endDelimited_(e)}};
jspb.BinaryWriter.prototype.writeRepeatedGroup=function(a,b,c){if(null!=b)for(var d=0;d<b.length;d++)this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.START_GROUP),c(b[d],this),this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.END_GROUP)};jspb.BinaryWriter.prototype.writeRepeatedFixedHash64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeFixedHash64(a,b[c])};
jspb.BinaryWriter.prototype.writeRepeatedVarintHash64=function(a,b){if(null!=b)for(var c=0;c<b.length;c++)this.writeVarintHash64(a,b[c])};jspb.BinaryWriter.prototype.writePackedInt32=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeSignedVarint32(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedInt32String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeSignedVarint32(parseInt(b[d],10));this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedInt64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeSignedVarint64(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedInt64String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++){var e=jspb.arith.Int64.fromString(b[d]);this.encoder_.writeSplitVarint64(e.lo,e.hi)}this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedUint32=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeUnsignedVarint32(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedUint32String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeUnsignedVarint32(parseInt(b[d],10));this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedUint64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeUnsignedVarint64(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedUint64String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++){var e=jspb.arith.UInt64.fromString(b[d]);this.encoder_.writeSplitVarint64(e.lo,e.hi)}this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedSint32=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeZigzagVarint32(b[d]);this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedSint64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeZigzagVarint64(b[d]);this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedSint64String=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeZigzagVarint64(parseInt(b[d],10));this.endDelimited_(c)}};
jspb.BinaryWriter.prototype.writePackedFixed32=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(4*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeUint32(b[c])}};jspb.BinaryWriter.prototype.writePackedFixed64=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeUint64(b[c])}};
jspb.BinaryWriter.prototype.writePackedFixed64String=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++){var d=jspb.arith.UInt64.fromString(b[c]);this.encoder_.writeSplitFixed64(d.lo,d.hi)}}};
jspb.BinaryWriter.prototype.writePackedSfixed32=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(4*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeInt32(b[c])}};jspb.BinaryWriter.prototype.writePackedSfixed64=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeInt64(b[c])}};
jspb.BinaryWriter.prototype.writePackedSfixed64String=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeInt64String(b[c])}};jspb.BinaryWriter.prototype.writePackedFloat=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(4*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeFloat(b[c])}};
jspb.BinaryWriter.prototype.writePackedDouble=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeDouble(b[c])}};jspb.BinaryWriter.prototype.writePackedBool=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(b.length);for(var c=0;c<b.length;c++)this.encoder_.writeBool(b[c])}};
jspb.BinaryWriter.prototype.writePackedEnum=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeEnum(b[d]);this.endDelimited_(c)}};jspb.BinaryWriter.prototype.writePackedFixedHash64=function(a,b){if(null!=b&&b.length){this.writeFieldHeader_(a,jspb.BinaryConstants.WireType.DELIMITED);this.encoder_.writeUnsignedVarint32(8*b.length);for(var c=0;c<b.length;c++)this.encoder_.writeFixedHash64(b[c])}};
jspb.BinaryWriter.prototype.writePackedVarintHash64=function(a,b){if(null!=b&&b.length){for(var c=this.beginDelimited_(a),d=0;d<b.length;d++)this.encoder_.writeVarintHash64(b[d]);this.endDelimited_(c)}};jspb.BinaryIterator=function(a,b,c){this.elements_=this.nextMethod_=this.decoder_=null;this.cursor_=0;this.nextValue_=null;this.atEnd_=!0;this.init_(a,b,c)};jspb.BinaryIterator.prototype.init_=function(a,b,c){a&&b&&(this.decoder_=a,this.nextMethod_=b);this.elements_=c||null;this.cursor_=0;this.nextValue_=null;this.atEnd_=!this.decoder_&&!this.elements_;this.next()};jspb.BinaryIterator.instanceCache_=[];
jspb.BinaryIterator.alloc=function(a,b,c){if(jspb.BinaryIterator.instanceCache_.length){var d=jspb.BinaryIterator.instanceCache_.pop();d.init_(a,b,c);return d}return new jspb.BinaryIterator(a,b,c)};jspb.BinaryIterator.prototype.free=function(){this.clear();100>jspb.BinaryIterator.instanceCache_.length&&jspb.BinaryIterator.instanceCache_.push(this)};
jspb.BinaryIterator.prototype.clear=function(){this.decoder_&&this.decoder_.free();this.elements_=this.nextMethod_=this.decoder_=null;this.cursor_=0;this.nextValue_=null;this.atEnd_=!0};jspb.BinaryIterator.prototype.get=function(){return this.nextValue_};jspb.BinaryIterator.prototype.atEnd=function(){return this.atEnd_};
jspb.BinaryIterator.prototype.next=function(){var a=this.nextValue_;this.decoder_?this.decoder_.atEnd()?(this.nextValue_=null,this.atEnd_=!0):this.nextValue_=this.nextMethod_.call(this.decoder_):this.elements_&&(this.cursor_==this.elements_.length?(this.nextValue_=null,this.atEnd_=!0):this.nextValue_=this.elements_[this.cursor_++]);return a};jspb.BinaryDecoder=function(a,b,c){this.bytes_=null;this.tempHigh_=this.tempLow_=this.cursor_=this.end_=this.start_=0;this.error_=!1;a&&this.setBlock(a,b,c)};
jspb.BinaryDecoder.instanceCache_=[];jspb.BinaryDecoder.alloc=function(a,b,c){if(jspb.BinaryDecoder.instanceCache_.length){var d=jspb.BinaryDecoder.instanceCache_.pop();a&&d.setBlock(a,b,c);return d}return new jspb.BinaryDecoder(a,b,c)};jspb.BinaryDecoder.prototype.free=function(){this.clear();100>jspb.BinaryDecoder.instanceCache_.length&&jspb.BinaryDecoder.instanceCache_.push(this)};jspb.BinaryDecoder.prototype.clone=function(){return jspb.BinaryDecoder.alloc(this.bytes_,this.start_,this.end_-this.start_)};
jspb.BinaryDecoder.prototype.clear=function(){this.bytes_=null;this.cursor_=this.end_=this.start_=0;this.error_=!1};jspb.BinaryDecoder.prototype.getBuffer=function(){return this.bytes_};jspb.BinaryDecoder.prototype.setBlock=function(a,b,c){this.bytes_=jspb.utils.byteSourceToUint8Array(a);this.start_=goog.isDef(b)?b:0;this.end_=goog.isDef(c)?this.start_+c:this.bytes_.length;this.cursor_=this.start_};jspb.BinaryDecoder.prototype.getEnd=function(){return this.end_};
jspb.BinaryDecoder.prototype.setEnd=function(a){this.end_=a};jspb.BinaryDecoder.prototype.reset=function(){this.cursor_=this.start_};jspb.BinaryDecoder.prototype.getCursor=function(){return this.cursor_};jspb.BinaryDecoder.prototype.setCursor=function(a){this.cursor_=a};jspb.BinaryDecoder.prototype.advance=function(a){this.cursor_+=a;goog.asserts.assert(this.cursor_<=this.end_)};jspb.BinaryDecoder.prototype.atEnd=function(){return this.cursor_==this.end_};
jspb.BinaryDecoder.prototype.pastEnd=function(){return this.cursor_>this.end_};jspb.BinaryDecoder.prototype.getError=function(){return this.error_||0>this.cursor_||this.cursor_>this.end_};
jspb.BinaryDecoder.prototype.readSplitVarint64_=function(){for(var a,b=0,c,d=0;4>d;d++)if(a=this.bytes_[this.cursor_++],b|=(a&127)<<7*d,128>a){this.tempLow_=b>>>0;this.tempHigh_=0;return}a=this.bytes_[this.cursor_++];b|=(a&127)<<28;c=0|(a&127)>>4;if(128>a)this.tempLow_=b>>>0,this.tempHigh_=c>>>0;else{for(d=0;5>d;d++)if(a=this.bytes_[this.cursor_++],c|=(a&127)<<7*d+3,128>a){this.tempLow_=b>>>0;this.tempHigh_=c>>>0;return}goog.asserts.fail("Failed to read varint, encoding is invalid.");this.error_=
!0}};jspb.BinaryDecoder.prototype.skipVarint=function(){for(;this.bytes_[this.cursor_]&128;)this.cursor_++;this.cursor_++};jspb.BinaryDecoder.prototype.unskipVarint=function(a){for(;128<a;)this.cursor_--,a>>>=7;this.cursor_--};
jspb.BinaryDecoder.prototype.readUnsignedVarint32=function(){var a,b=this.bytes_;a=b[this.cursor_+0];var c=a&127;if(128>a)return this.cursor_+=1,goog.asserts.assert(this.cursor_<=this.end_),c;a=b[this.cursor_+1];c|=(a&127)<<7;if(128>a)return this.cursor_+=2,goog.asserts.assert(this.cursor_<=this.end_),c;a=b[this.cursor_+2];c|=(a&127)<<14;if(128>a)return this.cursor_+=3,goog.asserts.assert(this.cursor_<=this.end_),c;a=b[this.cursor_+3];c|=(a&127)<<21;if(128>a)return this.cursor_+=4,goog.asserts.assert(this.cursor_<=
this.end_),c;a=b[this.cursor_+4];c|=(a&15)<<28;if(128>a)return this.cursor_+=5,goog.asserts.assert(this.cursor_<=this.end_),c>>>0;this.cursor_+=5;128<=b[this.cursor_++]&&128<=b[this.cursor_++]&&128<=b[this.cursor_++]&&128<=b[this.cursor_++]&&128<=b[this.cursor_++]&&goog.asserts.assert(!1);goog.asserts.assert(this.cursor_<=this.end_);return c};jspb.BinaryDecoder.prototype.readSignedVarint32=jspb.BinaryDecoder.prototype.readUnsignedVarint32;jspb.BinaryDecoder.prototype.readUnsignedVarint32String=function(){return this.readUnsignedVarint32().toString()};
jspb.BinaryDecoder.prototype.readSignedVarint32String=function(){return this.readSignedVarint32().toString()};jspb.BinaryDecoder.prototype.readZigzagVarint32=function(){var a=this.readUnsignedVarint32();return a>>>1^-(a&1)};jspb.BinaryDecoder.prototype.readUnsignedVarint64=function(){this.readSplitVarint64_();return jspb.utils.joinUint64(this.tempLow_,this.tempHigh_)};
jspb.BinaryDecoder.prototype.readUnsignedVarint64String=function(){this.readSplitVarint64_();return jspb.utils.joinUnsignedDecimalString(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readSignedVarint64=function(){this.readSplitVarint64_();return jspb.utils.joinInt64(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readSignedVarint64String=function(){this.readSplitVarint64_();return jspb.utils.joinSignedDecimalString(this.tempLow_,this.tempHigh_)};
jspb.BinaryDecoder.prototype.readZigzagVarint64=function(){this.readSplitVarint64_();return jspb.utils.joinZigzag64(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readZigzagVarint64String=function(){return this.readZigzagVarint64().toString()};jspb.BinaryDecoder.prototype.readUint8=function(){var a=this.bytes_[this.cursor_+0];this.cursor_+=1;goog.asserts.assert(this.cursor_<=this.end_);return a};
jspb.BinaryDecoder.prototype.readUint16=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1];this.cursor_+=2;goog.asserts.assert(this.cursor_<=this.end_);return a<<0|b<<8};jspb.BinaryDecoder.prototype.readUint32=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1],c=this.bytes_[this.cursor_+2],d=this.bytes_[this.cursor_+3];this.cursor_+=4;goog.asserts.assert(this.cursor_<=this.end_);return(a<<0|b<<8|c<<16|d<<24)>>>0};
jspb.BinaryDecoder.prototype.readUint64=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinUint64(a,b)};jspb.BinaryDecoder.prototype.readUint64String=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinUnsignedDecimalString(a,b)};jspb.BinaryDecoder.prototype.readInt8=function(){var a=this.bytes_[this.cursor_+0];this.cursor_+=1;goog.asserts.assert(this.cursor_<=this.end_);return a<<24>>24};
jspb.BinaryDecoder.prototype.readInt16=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1];this.cursor_+=2;goog.asserts.assert(this.cursor_<=this.end_);return(a<<0|b<<8)<<16>>16};jspb.BinaryDecoder.prototype.readInt32=function(){var a=this.bytes_[this.cursor_+0],b=this.bytes_[this.cursor_+1],c=this.bytes_[this.cursor_+2],d=this.bytes_[this.cursor_+3];this.cursor_+=4;goog.asserts.assert(this.cursor_<=this.end_);return a<<0|b<<8|c<<16|d<<24};
jspb.BinaryDecoder.prototype.readInt64=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinInt64(a,b)};jspb.BinaryDecoder.prototype.readInt64String=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinSignedDecimalString(a,b)};jspb.BinaryDecoder.prototype.readFloat=function(){var a=this.readUint32();return jspb.utils.joinFloat32(a,0)};
jspb.BinaryDecoder.prototype.readDouble=function(){var a=this.readUint32(),b=this.readUint32();return jspb.utils.joinFloat64(a,b)};jspb.BinaryDecoder.prototype.readBool=function(){return!!this.bytes_[this.cursor_++]};jspb.BinaryDecoder.prototype.readEnum=function(){return this.readSignedVarint32()};
jspb.BinaryDecoder.prototype.readString=function(a){var b=this.bytes_,c=this.cursor_;a=c+a;for(var d=[],e="";c<a;){var f=b[c++];if(128>f)d.push(f);else if(192>f)continue;else if(224>f){var g=b[c++];d.push((f&31)<<6|g&63)}else if(240>f){var g=b[c++],h=b[c++];d.push((f&15)<<12|(g&63)<<6|h&63)}else if(248>f){var g=b[c++],h=b[c++],k=b[c++],f=(f&7)<<18|(g&63)<<12|(h&63)<<6|k&63,f=f-65536;d.push((f>>10&1023)+55296,(f&1023)+56320)}8192<=d.length&&(e+=String.fromCharCode.apply(null,d),d.length=0)}e+=goog.crypt.byteArrayToString(d);
this.cursor_=c;return e};jspb.BinaryDecoder.prototype.readStringWithLength=function(){var a=this.readUnsignedVarint32();return this.readString(a)};jspb.BinaryDecoder.prototype.readBytes=function(a){if(0>a||this.cursor_+a>this.bytes_.length)return this.error_=!0,goog.asserts.fail("Invalid byte length!"),new Uint8Array(0);var b=this.bytes_.subarray(this.cursor_,this.cursor_+a);this.cursor_+=a;goog.asserts.assert(this.cursor_<=this.end_);return b};
jspb.BinaryDecoder.prototype.readVarintHash64=function(){this.readSplitVarint64_();return jspb.utils.joinHash64(this.tempLow_,this.tempHigh_)};jspb.BinaryDecoder.prototype.readFixedHash64=function(){var a=this.bytes_,b=this.cursor_,c=a[b+0],d=a[b+1],e=a[b+2],f=a[b+3],g=a[b+4],h=a[b+5],k=a[b+6],a=a[b+7];this.cursor_+=8;return String.fromCharCode(c,d,e,f,g,h,k,a)};jspb.BinaryReader=function(a,b,c){this.decoder_=jspb.BinaryDecoder.alloc(a,b,c);this.fieldCursor_=this.decoder_.getCursor();this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID;this.error_=!1;this.readCallbacks_=null};jspb.BinaryReader.instanceCache_=[];
jspb.BinaryReader.alloc=function(a,b,c){if(jspb.BinaryReader.instanceCache_.length){var d=jspb.BinaryReader.instanceCache_.pop();a&&d.decoder_.setBlock(a,b,c);return d}return new jspb.BinaryReader(a,b,c)};jspb.BinaryReader.prototype.alloc=jspb.BinaryReader.alloc;
jspb.BinaryReader.prototype.free=function(){this.decoder_.clear();this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID;this.error_=!1;this.readCallbacks_=null;100>jspb.BinaryReader.instanceCache_.length&&jspb.BinaryReader.instanceCache_.push(this)};jspb.BinaryReader.prototype.getFieldCursor=function(){return this.fieldCursor_};jspb.BinaryReader.prototype.getCursor=function(){return this.decoder_.getCursor()};
jspb.BinaryReader.prototype.getBuffer=function(){return this.decoder_.getBuffer()};jspb.BinaryReader.prototype.getFieldNumber=function(){return this.nextField_};jspb.BinaryReader.prototype.getWireType=function(){return this.nextWireType_};jspb.BinaryReader.prototype.isEndGroup=function(){return this.nextWireType_==jspb.BinaryConstants.WireType.END_GROUP};jspb.BinaryReader.prototype.getError=function(){return this.error_||this.decoder_.getError()};
jspb.BinaryReader.prototype.setBlock=function(a,b,c){this.decoder_.setBlock(a,b,c);this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID};jspb.BinaryReader.prototype.reset=function(){this.decoder_.reset();this.nextField_=jspb.BinaryConstants.INVALID_FIELD_NUMBER;this.nextWireType_=jspb.BinaryConstants.WireType.INVALID};jspb.BinaryReader.prototype.advance=function(a){this.decoder_.advance(a)};
jspb.BinaryReader.prototype.nextField=function(){if(this.decoder_.atEnd())return!1;if(this.getError())return goog.asserts.fail("Decoder hit an error"),!1;this.fieldCursor_=this.decoder_.getCursor();var a=this.decoder_.readUnsignedVarint32(),b=a>>>3,a=a&7;if(a!=jspb.BinaryConstants.WireType.VARINT&&a!=jspb.BinaryConstants.WireType.FIXED32&&a!=jspb.BinaryConstants.WireType.FIXED64&&a!=jspb.BinaryConstants.WireType.DELIMITED&&a!=jspb.BinaryConstants.WireType.START_GROUP&&a!=jspb.BinaryConstants.WireType.END_GROUP)return goog.asserts.fail("Invalid wire type"),
this.error_=!0,!1;this.nextField_=b;this.nextWireType_=a;return!0};jspb.BinaryReader.prototype.unskipHeader=function(){this.decoder_.unskipVarint(this.nextField_<<3|this.nextWireType_)};jspb.BinaryReader.prototype.skipMatchingFields=function(){var a=this.nextField_;for(this.unskipHeader();this.nextField()&&this.getFieldNumber()==a;)this.skipField();this.decoder_.atEnd()||this.unskipHeader()};
jspb.BinaryReader.prototype.skipVarintField=function(){this.nextWireType_!=jspb.BinaryConstants.WireType.VARINT?(goog.asserts.fail("Invalid wire type for skipVarintField"),this.skipField()):this.decoder_.skipVarint()};jspb.BinaryReader.prototype.skipDelimitedField=function(){if(this.nextWireType_!=jspb.BinaryConstants.WireType.DELIMITED)goog.asserts.fail("Invalid wire type for skipDelimitedField"),this.skipField();else{var a=this.decoder_.readUnsignedVarint32();this.decoder_.advance(a)}};
jspb.BinaryReader.prototype.skipFixed32Field=function(){this.nextWireType_!=jspb.BinaryConstants.WireType.FIXED32?(goog.asserts.fail("Invalid wire type for skipFixed32Field"),this.skipField()):this.decoder_.advance(4)};jspb.BinaryReader.prototype.skipFixed64Field=function(){this.nextWireType_!=jspb.BinaryConstants.WireType.FIXED64?(goog.asserts.fail("Invalid wire type for skipFixed64Field"),this.skipField()):this.decoder_.advance(8)};
jspb.BinaryReader.prototype.skipGroup=function(){var a=[this.nextField_];do{if(!this.nextField()){goog.asserts.fail("Unmatched start-group tag: stream EOF");this.error_=!0;break}if(this.nextWireType_==jspb.BinaryConstants.WireType.START_GROUP)a.push(this.nextField_);else if(this.nextWireType_==jspb.BinaryConstants.WireType.END_GROUP&&this.nextField_!=a.pop()){goog.asserts.fail("Unmatched end-group tag");this.error_=!0;break}}while(0<a.length)};
jspb.BinaryReader.prototype.skipField=function(){switch(this.nextWireType_){case jspb.BinaryConstants.WireType.VARINT:this.skipVarintField();break;case jspb.BinaryConstants.WireType.FIXED64:this.skipFixed64Field();break;case jspb.BinaryConstants.WireType.DELIMITED:this.skipDelimitedField();break;case jspb.BinaryConstants.WireType.FIXED32:this.skipFixed32Field();break;case jspb.BinaryConstants.WireType.START_GROUP:this.skipGroup();break;default:goog.asserts.fail("Invalid wire encoding for field.")}};
jspb.BinaryReader.prototype.registerReadCallback=function(a,b){goog.isNull(this.readCallbacks_)&&(this.readCallbacks_={});goog.asserts.assert(!this.readCallbacks_[a]);this.readCallbacks_[a]=b};jspb.BinaryReader.prototype.runReadCallback=function(a){goog.asserts.assert(!goog.isNull(this.readCallbacks_));a=this.readCallbacks_[a];goog.asserts.assert(a);return a(this)};
jspb.BinaryReader.prototype.readAny=function(a){this.nextWireType_=jspb.BinaryConstants.FieldTypeToWireType(a);var b=jspb.BinaryConstants.FieldType;switch(a){case b.DOUBLE:return this.readDouble();case b.FLOAT:return this.readFloat();case b.INT64:return this.readInt64();case b.UINT64:return this.readUint64();case b.INT32:return this.readInt32();case b.FIXED64:return this.readFixed64();case b.FIXED32:return this.readFixed32();case b.BOOL:return this.readBool();case b.STRING:return this.readString();
case b.GROUP:goog.asserts.fail("Group field type not supported in readAny()");case b.MESSAGE:goog.asserts.fail("Message field type not supported in readAny()");case b.BYTES:return this.readBytes();case b.UINT32:return this.readUint32();case b.ENUM:return this.readEnum();case b.SFIXED32:return this.readSfixed32();case b.SFIXED64:return this.readSfixed64();case b.SINT32:return this.readSint32();case b.SINT64:return this.readSint64();case b.FHASH64:return this.readFixedHash64();case b.VHASH64:return this.readVarintHash64();
default:goog.asserts.fail("Invalid field type in readAny()")}return 0};jspb.BinaryReader.prototype.readMessage=function(a,b){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var c=this.decoder_.getEnd(),d=this.decoder_.readUnsignedVarint32(),d=this.decoder_.getCursor()+d;this.decoder_.setEnd(d);b(a,this);this.decoder_.setCursor(d);this.decoder_.setEnd(c)};
jspb.BinaryReader.prototype.readGroup=function(a,b,c){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.START_GROUP);goog.asserts.assert(this.nextField_==a);c(b,this);this.error_||this.nextWireType_==jspb.BinaryConstants.WireType.END_GROUP||(goog.asserts.fail("Group submessage did not end with an END_GROUP tag"),this.error_=!0)};
jspb.BinaryReader.prototype.getFieldDecoder=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var a=this.decoder_.readUnsignedVarint32(),b=this.decoder_.getCursor(),c=b+a,a=jspb.BinaryDecoder.alloc(this.decoder_.getBuffer(),b,a);this.decoder_.setCursor(c);return a};jspb.BinaryReader.prototype.readInt32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint32()};
jspb.BinaryReader.prototype.readInt32String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint32String()};jspb.BinaryReader.prototype.readInt64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint64()};jspb.BinaryReader.prototype.readInt64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint64String()};
jspb.BinaryReader.prototype.readUint32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint32()};jspb.BinaryReader.prototype.readUint32String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint32String()};jspb.BinaryReader.prototype.readUint64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint64()};
jspb.BinaryReader.prototype.readUint64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readUnsignedVarint64String()};jspb.BinaryReader.prototype.readSint32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readZigzagVarint32()};jspb.BinaryReader.prototype.readSint64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readZigzagVarint64()};
jspb.BinaryReader.prototype.readSint64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readZigzagVarint64String()};jspb.BinaryReader.prototype.readFixed32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readUint32()};jspb.BinaryReader.prototype.readFixed64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readUint64()};
jspb.BinaryReader.prototype.readFixed64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readUint64String()};jspb.BinaryReader.prototype.readSfixed32=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readInt32()};jspb.BinaryReader.prototype.readSfixed32String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readInt32().toString()};
jspb.BinaryReader.prototype.readSfixed64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readInt64()};jspb.BinaryReader.prototype.readSfixed64String=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readInt64String()};jspb.BinaryReader.prototype.readFloat=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED32);return this.decoder_.readFloat()};
jspb.BinaryReader.prototype.readDouble=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readDouble()};jspb.BinaryReader.prototype.readBool=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return!!this.decoder_.readUnsignedVarint32()};jspb.BinaryReader.prototype.readEnum=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readSignedVarint64()};
jspb.BinaryReader.prototype.readString=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var a=this.decoder_.readUnsignedVarint32();return this.decoder_.readString(a)};jspb.BinaryReader.prototype.readBytes=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);var a=this.decoder_.readUnsignedVarint32();return this.decoder_.readBytes(a)};
jspb.BinaryReader.prototype.readVarintHash64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.VARINT);return this.decoder_.readVarintHash64()};jspb.BinaryReader.prototype.readFixedHash64=function(){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.FIXED64);return this.decoder_.readFixedHash64()};
jspb.BinaryReader.prototype.readPackedField_=function(a){goog.asserts.assert(this.nextWireType_==jspb.BinaryConstants.WireType.DELIMITED);for(var b=this.decoder_.readUnsignedVarint32(),b=this.decoder_.getCursor()+b,c=[];this.decoder_.getCursor()<b;)c.push(a.call(this.decoder_));return c};jspb.BinaryReader.prototype.readPackedInt32=function(){return this.readPackedField_(this.decoder_.readSignedVarint32)};jspb.BinaryReader.prototype.readPackedInt32String=function(){return this.readPackedField_(this.decoder_.readSignedVarint32String)};
jspb.BinaryReader.prototype.readPackedInt64=function(){return this.readPackedField_(this.decoder_.readSignedVarint64)};jspb.BinaryReader.prototype.readPackedInt64String=function(){return this.readPackedField_(this.decoder_.readSignedVarint64String)};jspb.BinaryReader.prototype.readPackedUint32=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint32)};jspb.BinaryReader.prototype.readPackedUint32String=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint32String)};
jspb.BinaryReader.prototype.readPackedUint64=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint64)};jspb.BinaryReader.prototype.readPackedUint64String=function(){return this.readPackedField_(this.decoder_.readUnsignedVarint64String)};jspb.BinaryReader.prototype.readPackedSint32=function(){return this.readPackedField_(this.decoder_.readZigzagVarint32)};jspb.BinaryReader.prototype.readPackedSint64=function(){return this.readPackedField_(this.decoder_.readZigzagVarint64)};
jspb.BinaryReader.prototype.readPackedSint64String=function(){return this.readPackedField_(this.decoder_.readZigzagVarint64String)};jspb.BinaryReader.prototype.readPackedFixed32=function(){return this.readPackedField_(this.decoder_.readUint32)};jspb.BinaryReader.prototype.readPackedFixed64=function(){return this.readPackedField_(this.decoder_.readUint64)};jspb.BinaryReader.prototype.readPackedFixed64String=function(){return this.readPackedField_(this.decoder_.readUint64String)};
jspb.BinaryReader.prototype.readPackedSfixed32=function(){return this.readPackedField_(this.decoder_.readInt32)};jspb.BinaryReader.prototype.readPackedSfixed64=function(){return this.readPackedField_(this.decoder_.readInt64)};jspb.BinaryReader.prototype.readPackedSfixed64String=function(){return this.readPackedField_(this.decoder_.readInt64String)};jspb.BinaryReader.prototype.readPackedFloat=function(){return this.readPackedField_(this.decoder_.readFloat)};
jspb.BinaryReader.prototype.readPackedDouble=function(){return this.readPackedField_(this.decoder_.readDouble)};jspb.BinaryReader.prototype.readPackedBool=function(){return this.readPackedField_(this.decoder_.readBool)};jspb.BinaryReader.prototype.readPackedEnum=function(){return this.readPackedField_(this.decoder_.readEnum)};jspb.BinaryReader.prototype.readPackedVarintHash64=function(){return this.readPackedField_(this.decoder_.readVarintHash64)};
jspb.BinaryReader.prototype.readPackedFixedHash64=function(){return this.readPackedField_(this.decoder_.readFixedHash64)};jspb.Export={};exports.Map=jspb.Map;exports.Message=jspb.Message;exports.BinaryReader=jspb.BinaryReader;exports.BinaryWriter=jspb.BinaryWriter;exports.ExtensionFieldInfo=jspb.ExtensionFieldInfo;exports.ExtensionFieldBinaryInfo=jspb.ExtensionFieldBinaryInfo;exports.exportSymbol=goog.exportSymbol;exports.inherits=goog.inherits;exports.object={extend:goog.object.extend};exports.typeOf=goog.typeOf;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":2}]},{},[4]);
