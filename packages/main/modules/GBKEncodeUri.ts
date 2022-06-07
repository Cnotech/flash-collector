const Iconv = require('iconv').Iconv

export default function (uri: string): string {
    let i = new Iconv('UTF-8', 'GBK');
    let from = i.convert(uri);
    let rt = '';
    for (let i = 0; i < from.length; i++) {
        let c = from.readUInt8(i);
        if (c > 127) {
            i++;
            let c2 = from.readUInt8(i);
            rt += '%' + c.toString(16) + '%' + c2.toString(16);
        } else {
            rt += String.fromCharCode(c);
        }
    }
    return rt;
}
