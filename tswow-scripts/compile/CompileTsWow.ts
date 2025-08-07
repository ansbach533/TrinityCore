/*
 * This file is part of tswow (https://github.com/tswow)
 *
 * Copyright (C) 2020 tswow <https://github.com/tswow/>
 * This program is free software: you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import { Args } from '../util/Args';
import { commands } from '../util/Commands';
import { parseConf } from '../util/ConfigFile';
import { ipaths } from '../util/Paths';
import { isWindows } from '../util/Platform';
import { term } from '../util/Terminal';
import { setContext } from '../util/TSWoWContext';
import { SevenZipInstall } from './7Zip';
import { ADTCreator } from './ADTCreator';
import { BLPConverter } from './BLPConverter';
import { Boost } from './Boost';
import { isInteractive } from './BuildConfig';
import { ClientExtensions } from './ClientExtensions';
import { CMake } from './Cmake';
import { bpaths, spaths } from './CompilePaths';
import { Config } from './Config';
import { IMInstall } from './ImageMagick';
import { MPQBuilder } from './MPQBuilder';
import { MySQL } from './MySQL';
import { NodeJS } from './Node';
import { OpenSSL } from './OpenSSL';
import { Scripts } from './Scripts';
import { TrinityCore } from './TrinityCore';
setContext('build');

let buildingScripts = false;

async function compile(compileArgs: string[]) {
    // Load necessary libraries
    function isType(check: string) {
        return compileArgs.includes('full') || compileArgs.includes('release') || compileArgs.includes(check) || compileArgs.includes(`${check}-release`) || compileArgs.includes(`${check}-relwithdebinfo`) || compileArgs.includes(`${check}-debug`);
    }

    const cmake = isWindows() ? (await CMake.find()).get() : 'cmake';
    term.log('build',`Found cmake at ${cmake}`);
    const openssl = isWindows() ? (await OpenSSL.find()).get() : 'openssl';
    term.log('build',`Found OpenSSL at ${openssl}`);
    const mysql = isWindows() ? await MySQL.find() : 'mysql';
    term.log('build',`Found MySQL at ${mysql}`);
    const boost = isWindows() ? await Boost.install() : 'boost';
    await NodeJS.install();
    if (isWindows()) { await SevenZipInstall.install(); }
    if (isWindows()) { await IMInstall.install() }

    if (isType('trinitycore')) {
        await TrinityCore.install(cmake, openssl, mysql, compileArgs);
    }

    if (isType('mpqbuilder')) { await MPQBuilder.create(cmake); }
    if (isType('blpconverter')) { await BLPConverter.install(cmake); }
    if (isWindows() && isType('adtcreator')) { await ADTCreator.create(cmake); }
    if (isType('client-extensions')) { await ClientExtensions.create(cmake); }

    if (!buildingScripts && isType('scripts')) {
        await Scripts.build();
        buildingScripts = true;
    }

    if(isType('config')) {
        await Config.create();
    }

    if (process.argv.includes('tswow-release')) {
        term.log('build',`Creating ${bpaths.release_7z.get()}`);
        SevenZipInstall.makeArchive(bpaths.release_7z.abs().get(), ipaths.abs().get());
    }

    term.log('build','Installation successful!');
}

async function main() {
    term.Initialize(
          bpaths.terminal_history.get()
        , 100
        , process.argv.includes('--displayTimestamps')
        , process.argv.includes('--displayNames')
        );
    const build = commands.addCommand('build');
    await compile(['scripts']);

    const installedPrograms =
        [
              'trinitycore'
            , 'trinitycore-release'
            , 'trinitycore-relwithdebinfo'
            , 'trinitycore-debug'
            , 'mpqbuilder'
            , 'blpconverter'
            , 'config'
            , 'database'
            , 'full'
            , 'scripts'
            , 'clean-install'
            , 'clean-build'
            , 'release'
            , 'adtcreator'
            , 'client-extensions'
        ];

    for (const val of installedPrograms) {
        build.addCommand(val, '', `Builds ${val}`, async(args) => await compile([val, ...args]));
    }

    // build.addCommand('base', '', 'Builds only base dependencies', async(args) => await compile('', args));

    commands.addCommand('headers','','',async(args)=>{
        TrinityCore.headers(Args.hasFlag('global-only',args));
    });

    commands.enterLoop();
}


(async function(){
    /*
    if (spaths.tc_builds.exists()) {
        const conf = parseConf(spaths.tc_builds.readString())
        console.log(conf)
    } else {

    }
    return;
    */
    if (!spaths.tc_cmake_params.exists()) {
        spaths.tc_cmake_params.write(
            '-DTRACY_ENABLE=ON\n' +
            '-DTRACY_TIMER_FALLBACK=ON\n'
        )
    }
    if(!spaths.tswow_scripts.wotlk.global_d_ts.exists()) {
        TrinityCore.headers(true);
    }

    if(Args.hasFlag('gdts-only', [process.argv])) {
        TrinityCore.headers(true);
        process.exit(0);
    }

    if(isInteractive) {
        main();
    } else {
        await compile(process.argv);
        process.exit(0);
    }
}())
