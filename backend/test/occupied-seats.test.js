const {test}=require('node:test');
const assert=require('node:assert/strict');
const {occupiedSeats}=require('../db/occupied-seats');
test('posti occupati: massimo simultaneo, senza sommare intervalli consecutivi',async()=>{
  const db={all:async()=>[
    {startTime:'08:00',endTime:'10:00',seats:4},
    {startTime:'10:00',endTime:'12:00',seats:3},
    {startTime:'09:00',endTime:'11:00',seats:2},
  ]};
  assert.equal(await occupiedSeats(db,1,'2026-09-10','08:00','12:00'),6);
});
