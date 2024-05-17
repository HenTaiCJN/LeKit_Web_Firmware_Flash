<script setup lang="ts">
import {onMounted, ref} from "vue";
import axios from "axios";
import {ESPLoader, FlashOptions, LoaderOptions, Transport} from "esptool-js";
import {Terminal, api as TerminalApi} from "vue-web-terminal";
import MD5 from 'crypto-js/md5'
import Latin1 from 'crypto-js/enc-latin1'
import {Message} from "vue-web-terminal";
import {Action, ElMessage, ElMessageBox} from "element-plus";

onMounted(async () => {
    // firmware = await fetch('@/assets/firmware/firmware.bin')
    // axios.get('firmware.bin', {responseType: 'blob'})
    //     .then((res) => {
    //         let files = new File([res.data], 'firmware.bin')
    //         const reader = new FileReader();
    //         reader.onload = (ev: ProgressEvent<FileReader>) => {
    //             firmware = ev.target.result;
    //         };
    //
    //         reader.readAsBinaryString(files);
    //     })
    //     .catch((e) => {
    //         console.error('获取文件内容失败：', e);
    //     });

})

function input_test(evt) {
    console.log(evt);
    const file = evt.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev: ProgressEvent<FileReader>) => {
        evt.target.data = ev.target.result;

        let input = document.getElementById('input') as ChildNode & { data: string }
        console.log(input.data.length);
    };

    reader.readAsBinaryString(file);
}

let firmware

let device = null;
let transport: Transport;
let chip: string = null;
let esploader: ESPLoader;

const espLoaderTerminal = {
    clean() {
        TerminalApi.execute('shell', 'clear')
    },
    writeLine(data) {
        TerminalApi.pushMessage('shell', data)
    },
    write(data) {
        TerminalApi.appendMessage('shell', data)
    },
};
async function flashStart() {
    axios.get(firmwareSelect.value, {responseType: 'blob'})
        .then(async (res) => {
            let files = new File([res.data], 'firmware.bin')
            const reader = new FileReader();
            reader.onload = (ev: ProgressEvent<FileReader>) => {
                firmware = ev.target.result;
            };
            await reader.readAsBinaryString(files);
            await deviceConnect()
        })
        .catch((e) => {
            console.error('获取文件内容失败：', e);
        });

}
async function deviceConnect() {
    //连接
    const portFilters: { usbVendorId?: number | undefined, usbProductId?: number | undefined }[] = [];
    //@ts-ignore
    device = await navigator.serial.requestPort({filters: portFilters});
    transport = new Transport(device, true);
    try {
        const flashOptions = {
            transport,
            baudrate: 921600,
            terminal: espLoaderTerminal,
        } as LoaderOptions;

        esploader = new ESPLoader(flashOptions);
        chip = await esploader.main();
        await flashWrite()
        // Temporarily broken
        // await esploader.flashId();
    } catch (e) {
        console.error(e);
        TerminalApi.pushMessage('shell', e.message)
    }
}

async function flashWrite() {
    //烧写
    let fileArray = [];
    let progressBars = [];

    fileArray.push({data: firmware, address: parseInt('0x1000')});

    try {
        const flashOptions: FlashOptions = {
            fileArray: fileArray,
            flashSize: "keep",
            eraseAll: true,
            compress: true,
            calculateMD5Hash: (image) => {
                return MD5(Latin1.parse(image))
            },
        } as FlashOptions;
        await esploader.writeFlash(flashOptions);
        await esploader.hardReset()
        TerminalApi.pushMessage('shell', 'Hard RST')
        await device.close()
        await ElMessageBox.alert('固件刷入完成', '提示', {
            confirmButtonText: '确定'
        })
    } catch (e) {
        console.error(e);
        TerminalApi.pushMessage('shell', `Error: ${e.message}`);
        TerminalApi.pushMessage('shell', `失败，请重试`);
        device.close()
    }
}



function ________() {
}
let initLog:Message[]=[
    {
        type:"normal",
        content:'欢迎使用Lekit V3系列固件刷入系统。',
        class:"system"
    },
    {
        type:"normal",
        content:'请确保设备处于未连接状态，固件刷入过程中请勿断电。',
        class:"warning"
    },
    {
        type:"normal",
        content:'刷入前会连接(connect)设备，若长时间不成功请尝试设备断电和刷新网页',
        class:"warning"
    }
]
function onExecCmd(key, command, success, failed) {
    if (key === 'fail') {
        failed('Something wrong!!!')
    } else {
        let allClass = ['success', 'error', 'system', 'info', 'warning'];

        let clazz = allClass[Math.floor(Math.random() * allClass.length)];
        success({
            type: 'normal',
            class: clazz,
            tag: '成功',
            content: command
        })
    }
}

let firmwareSelect = ref('firmware.bin')
let firmwareList = [
    {
        value: 'firmware.bin',
        label: 'Lekit V3 C',
    },
]
</script>

<template>
    <div class="contaniner">
        <div>
            <img src="@/assets/logo-a.png" alt="" height="30px">
        </div>
        <div class="select">
            <span>请选择设备类型：</span>
            <el-select
                v-model="firmwareSelect"
                placeholder="Select"
                size="large"
                style="width: 240px"
            >
                <el-option
                    v-for="item in firmwareList"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
            </el-select>
        </div>
        <div class="btn">
            <el-button type="primary" @click="flashStart">开始刷入</el-button>
        </div>
    </div>
    <div class="shell">
        <div>
            <terminal name="shell" context="" :show-header="false" :init-log="initLog"/>
        </div>
    </div>
</template>

<style scoped>
.contaniner {
    text-align: center;
}

.contaniner div {
    padding: 10px;
}

.shell {
    display: flex;
    justify-content: center;
}

.shell div {
    width: 80%;
    height: 70vh;
}
</style>