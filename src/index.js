/*
MIT License

Copyright (c) Bryan Hughes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const five = require('johnny-five');
const Raspi = require('raspi-io');
const fs = require('fs');
const io = require('socket.io-client');

const CONFIG_FILE_PATH = '/etc/temperature-grid/conf.json';

if (!fs.existsSync(CONFIG_FILE_PATH)) {
  console.error(`No config file found at ${CONFIG_FILE_PATH}`);
  process.exit(-1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
if (!config.endpoint) {
  console.error('Config file is missing field "endpoint"');
  process.exit(-1);
}
if (!config.name) {
  console.error('Config file is missing field "name"');
  process.exit(-1);
}

const socket = io(config.endpoint);

const board = new five.Board({
  io: new Raspi(),
  repl: false,
  debug: false
});

process.stdout.write('Initializing board...');
board.on('ready', () => {
  process.stdout.write('done\n');
  process.stdout.write('Registering device with server...');
  socket.emit('register', { name: config.name }, () => {
    process.stdout.write('done\n');
    const thermometer = new five.Thermometer({
      controller: 'MCP9808'
    });
    thermometer.on('change', () => {
      console.log('update', thermometer.fahrenheit);
      socket.emit('update', {
        temperature: thermometer.fahrenheit
      });
    });
  });
});
