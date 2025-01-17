import React from 'react'
import { Button } from '@monorepo/react'
import { add } from '@monorepo/core'

function App() {
  return (
    <div className="app">
      <h1>Example React App</h1>
      <p>2 + 2 = {add(2, 2)}</p>
      <Button />
    </div>
  )
}

export default App