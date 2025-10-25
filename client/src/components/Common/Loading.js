import React from 'react'

const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="loading mb-4"></div>
      <p className="text-secondary">{message}</p>
    </div>
  )
}

export default Loading
