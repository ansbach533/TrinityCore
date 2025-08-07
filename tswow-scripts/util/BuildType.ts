import { parseConf } from "./ConfigFile";
import { WFile } from "./FileTree";

export interface BuildTypeObj {
    Type: 'Release' | 'RelWithDebInfo' | 'Debug'

    TrinityCMakeFlagsWindows: string
    TrinityCMakeFlagsLinux: string
    LivescriptCMakeFlagsWindows: string
    LivescriptCmakeFlagsLinux: string

    Name: string
    Scripts: string
}

export function parseBuildTypes(filePath: WFile) {
    const conf = parseConf(filePath.readString())
    const buildTypes: {[key: string]: BuildTypeObj} = {}
    for (let [key, value] of Object.entries(conf)) {
        let [type, keyName, ...keyTypes] = key.split('.')
        let keyType = keyTypes.join('.').toLowerCase()
        if (type.toLowerCase() !== 'target') {
            continue;
        }
        const buildType = (buildTypes[keyName] || (buildTypes[keyName] = { Type: 'RelWithDebInfo', Name: keyName, Scripts: 'dynamic', TrinityCMakeFlagsWindows: '', TrinityCMakeFlagsLinux: '', LivescriptCMakeFlagsWindows: '', LivescriptCmakeFlagsLinux: '' }))

        if (keyType.startsWith('cmakeflags')) {
            let isLivescripts = !keyType.includes('trinitycore')
            let isTrinityCore = !keyType.includes('livescripts')
            let isWindows = !keyType.includes('linux')
            let isLinux = !keyType.includes('windows')
            if (isLivescripts) {
                if (isWindows) {
                    buildType.LivescriptCMakeFlagsWindows += ` ${value}`
                }
                if (isLinux) {
                    buildType.LivescriptCmakeFlagsLinux += ` ${value}`
                }
            }
            if (isTrinityCore) {
                if (isWindows) {
                    buildType.TrinityCMakeFlagsWindows += ` ${value}`
                }
                if (isLinux) {
                    buildType.TrinityCMakeFlagsLinux += ` ${value}`
                }
            }
        }

        if (keyType === 'type') {
            // TODO: verify valid type
            buildType.Type = value
        }
        if (keyType === 'scripts') {
            if (value === 'minimal') {
                value = 'minimal-dynamic'
            }

            if (value === 'static') {
                throw new Error(`Static scripts are not supported (${keyName})`)
            }

            buildType.Scripts = value
        }
    }

    return Object.values(buildTypes)
}


export function parseBuildConf() {

}