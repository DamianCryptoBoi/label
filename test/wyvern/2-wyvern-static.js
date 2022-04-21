/* global artifacts:false, it:false, contract:false, assert:false */

const WyvernAtomicizer = artifacts.require('WyvernAtomicizer')
const WyvernStatic = artifacts.require('WyvernStatic')

contract('WyvernStatic',() => {
  it('is deployed',async () => {
    let Atomicizer = await WyvernAtomicizer.new();
    return await WyvernStatic.new(Atomicizer.address);
  })

  it('has the correct atomicizer address',async () => {
    let atomicizerInstance  = await WyvernAtomicizer.new();
    
    let staticInstance = await WyvernStatic.new(atomicizerInstance.address);
    assert.equal(await staticInstance.atomicizer(),atomicizerInstance.address,'incorrect atomicizer address')
  })
})
