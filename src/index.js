require("dotenv").config();
const Web3 = require('web3')
const routerAbi = require("./config/router.abi.json");
const erc20Abi = require("./config/erc20.abi.json");

const wethAddress =  process.env.WETH
const tokenAddress =  process.env.METACITIZEN
const routerAddress = process.env.ROUTER
const rpc = process.env.RPC
const privkey= process.env.PRIVATEKEY;


const rnd = (start, end) => Math.floor(Math.random() * end + start);
const RndAmount = (start, end) => Math.round((Math.random() * end + start) * 1000) / 1000;
const wait = (times) => new Promise(resolve=>setTimeout(resolve, times))
const hex = (value) => '0x' + BigInt(value).toString(16)

const {address} = new Web3().eth.accounts.privateKeyToAccount(privkey)


const now = +new Date();

const evm_sendtx = async (feeOnly, rpc, privkey, to, value, abi, method, args ) => {
	try {
		const web3 = new Web3(rpc)
		const account = web3.eth.accounts.privateKeyToAccount(privkey)
		const contract = new web3.eth.Contract(abi, to, { from: account.address, })
		const data = contract.methods[method](...args).encodeABI()
		const gasPrice = await web3.eth.getGasPrice()
		const gasLimit = await contract.methods[method](...args).estimateGas()
		if (feeOnly) return BigInt(gasPrice) * BigInt(gasLimit) // Math.ceil(Number(gasPrice)/1e9 * gasLimit / 1e3)/1e6;
		const json = { gasPrice, gasLimit, to, value, data }
		const signedTx = await web3.eth.accounts.signTransaction( json, privkey )
		const receipt = await web3.eth.sendSignedTransaction( signedTx.rawTransaction )
		if (receipt && receipt.transactionHash) return receipt.transactionHash
	} catch (err) {
		console.log(err)
	}
	return null
}

const buy = async (privkey, amount) => {
	await evm_sendtx(false, rpc, privkey, wethAddress, '0x0', erc20Abi, "approve", [
		routerAddress,
		hex(amount)
	])
	await wait(60000)
	await evm_sendtx(false, rpc, privkey, routerAddress, hex(amount),routerAbi, "swapExactETHForTokensSupportingFeeOnTransferTokens", [
		0,
		[wethAddress, tokenAddress],
		address,
		now
	])
	await wait(60000)
}
const sell = async (privkey, amount) => {
	await evm_sendtx(false, rpc, privkey, tokenAddress, '0x0', erc20Abi, "approve", [
		routerAddress,
		hex(amount)
	])
	await wait(60000)
	await evm_sendtx(false, rpc, privkey, routerAddress, routerAbi, '0x0', "swapExactTokensForETHSupportingFeeOnTransferTokens", [
		hex(amount),
		0,
        [wethAddress, tokenAddress],
		address,
		now
	])
	await wait(60000)
}

const run = async () => {
	if (rnd(1,2)%2===1) {
		await buy(privkey,RndAmount(0.01, 0.1) * 1e18)
		console.log("buy "+RndAmount(0.01, 0.1) * 1e18)
	} else {
		await sell(privkey,RndAmount(0.01, 0.1) * 1e18)
		console.log("sell "+RndAmount(0.01, 0.1) * 1e18)

	}
	setTimeout(run, rnd(3000, 6000))
	console.log("jhere")

};
run();
