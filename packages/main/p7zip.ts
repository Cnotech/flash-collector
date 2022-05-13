import cp from 'child_process';
import fs from 'fs';
import path from 'path';

const shell = require('shelljs');

const p7zip = path.join("retinue", "7zip", "7z.exe")

async function release(file: string, intoDir: string, overwrite?: boolean, cwd?: string): Promise<boolean> {
	return new Promise((resolve => {
		let aID = path.join(cwd ?? '', intoDir);
		if (overwrite && fs.existsSync(aID)) {
			if (fs.existsSync(aID)) {
				shell.rm('-rf', aID);
			}
			shell.mkdir('-p', aID);
		}
		try {
			cp.execSync(`${p7zip} x "${file}" -o"${intoDir}" -y`, {cwd});
		} catch (e) {
			console.log('Error:Release command failed\n' + e);
			resolve(false);
			return;
		}
		resolve(fs.existsSync(aID));
	}));
}

async function compress(choosePlainDir: string, file: string, compressLevel: number, cwd?: string): Promise<boolean> {
	return new Promise((resolve => {
		if (cwd) {
			shell.mkdir('-p', cwd);
		}
		shell.rm('-f', path.join(cwd ?? '', file));
		try {
			cp.execSync(`${p7zip} a -mx${compressLevel} ../"${file}" *`, {cwd: path.join(cwd ?? '', choosePlainDir)});
		} catch (e) {
			console.log('Error:Compress command failed\n' + e);
			resolve(false);
			return;
		}
		resolve(fs.existsSync(path.join(cwd ?? '', file)));
	}));
}

export {
	release,
	compress
}
