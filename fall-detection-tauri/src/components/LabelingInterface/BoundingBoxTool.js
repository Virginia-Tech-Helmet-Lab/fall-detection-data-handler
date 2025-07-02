import React, { useState, useEffect, useRef } from 'react';
import './BoundingBoxTool.css';

const BoundingBoxTool = ({ 
  canvasWidth, 
  canvasHeight, 
  onBoxesUpdate, 
  isActive, 
  currentFrame,
  videoId,
  selectedLabel
}) => {
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [boxes, setBoxes] = useState([]);
  const [currentBox, setCurrentBox] = useState(null);
  const [displayedBoxes, setDisplayedBoxes] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log("BoundingBoxTool props updated:", { isActive, selectedLabel, currentFrame });
  }, [isActive, selectedLabel, currentFrame]);

  // When isActive changes to false, clear the displayed boxes
  useEffect(() => {
    if (!isActive) {
      setDisplayedBoxes([]);
    }
  }, [isActive]);
  
  // Redraw boxes when frame changes or when boxes are updated
  useEffect(() => {
    if (isActive) {
      // Filter boxes for the current frame
      const currentFrameBoxes = boxes.filter(box => box.frameIndex === currentFrame);
      setDisplayedBoxes(currentFrameBoxes);
    }
  }, [currentFrame, boxes, isActive]);
  
  // Draw all displayed boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // First draw the confirmed boxes in green
    displayedBoxes.forEach(box => {
      ctx.strokeStyle = '#00FF00'; // Green
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Add label text
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fillRect(box.x, box.y - 20, 100, 20);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(box.partLabel, box.x + 5, box.y - 5);
    });
    
    // Then draw the current box being created in red
    if (currentBox) {
      ctx.strokeStyle = '#FF0000'; // Red
      ctx.lineWidth = 2;
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  }, [displayedBoxes, currentBox]);

  // Load existing bounding boxes when video changes
  useEffect(() => {
    if (videoId) {
      fetch(`http://localhost:5000/api/bbox-annotations/${videoId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch bounding boxes');
          }
          return response.json();
        })
        .then(data => {
          console.log("Loaded bounding boxes:", data);
          setBoxes(data.map(box => ({
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            frameIndex: box.frame_index,
            partLabel: box.part_label,
            video_id: box.video_id
          })));
        })
        .catch(error => console.error('Error loading bounding boxes:', error));
    }
  }, [videoId]);

  const handleMouseDown = (e) => {
    if (!isActive || !selectedLabel) return;
    
    setDrawing(true);
    
    const rect = canvasRef.current.getBoundingClientRect();
    // Calculate coordinates relative to the canvas size
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setStartPos({ x, y });
    setCurrentBox({ x, y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!drawing || !isActive) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const width = x - startPos.x;
    const height = y - startPos.y;
    
    setCurrentBox({ x: startPos.x, y: startPos.y, width, height });
  };

  const handleMouseUp = (e) => {
    if (!drawing || !isActive || !selectedLabel) return;
    
    setDrawing(false);
    
    // Only proceed if the box has some size
    if (currentBox && (Math.abs(currentBox.width) > 5 && Math.abs(currentBox.height) > 5)) {
      // Normalize negative width/height
      const normalizedBox = {
        x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
        y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
        frameIndex: currentFrame,
        partLabel: selectedLabel,
        video_id: videoId
      };
      
      // Show confirmation before saving
      if (window.confirm(`Save ${selectedLabel} bounding box at frame ${currentFrame}?\n\nClick Cancel to redraw.`)) {
        console.log("Saving box:", normalizedBox);
        
        // Save to backend
        saveBoundingBox(normalizedBox);
      } else {
        // User canceled, just clear the current box
        setCurrentBox(null);
      }
    } else {
      setCurrentBox(null);
    }
  };

  const saveBoundingBox = async (box) => {
    try {
      console.log("Saving bounding box with data:", {
        video_id: videoId,
        frame_index: currentFrame,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        part_label: selectedLabel
      });
      
      // Remove any existing indicator
      const existingIndicator = document.getElementById('bbox-save-indicator');
      if (existingIndicator && document.body.contains(existingIndicator)) {
        document.body.removeChild(existingIndicator);
      }
      
      // Create and append new indicator
      const saveIndicator = document.createElement('div');
      saveIndicator.id = 'bbox-save-indicator';
      saveIndicator.className = 'bbox-save-indicator';
      saveIndicator.textContent = 'Saving bounding box...';
      document.body.appendChild(saveIndicator);
      
      const response = await fetch('http://localhost:5000/api/bbox-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          frame_index: currentFrame,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          part_label: selectedLabel
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        saveIndicator.textContent = 'Bounding box saved!';
        saveIndicator.style.backgroundColor = 'rgba(40,167,69,0.8)';
        
        // Add the new box to the boxes array with the ID from the backend
        const newBox = {
          ...box,
          frameIndex: currentFrame,
          partLabel: selectedLabel,
          bbox_id: data.bbox_id
        };
        
        // Update boxes state with the new box
        const updatedBoxes = [...boxes, newBox];
        setBoxes(updatedBoxes);
        
        // Also update displayed boxes for the current frame
        setDisplayedBoxes(prevDisplayed => [...prevDisplayed, newBox]);
        
        // Clear current box being drawn
        setCurrentBox(null);
        
        // Notify parent component of the update
        if (onBoxesUpdate) {
          onBoxesUpdate(updatedBoxes);
        }
        
        // Set a timeout to remove the indicator
        setTimeout(() => {
          const indicator = document.getElementById('bbox-save-indicator');
          if (indicator && document.body.contains(indicator)) {
            document.body.removeChild(indicator);
          }
        }, 2000);

        console.log("Response from saving bbox:", data);
      } else {
        saveIndicator.textContent = 'Failed to save bounding box!';
        saveIndicator.style.backgroundColor = 'rgba(220,53,69,0.8)';
        console.error('Failed to save bounding box:', data.error || 'Unknown error');
        
        setTimeout(() => {
          const indicator = document.getElementById('bbox-save-indicator');
          if (indicator && document.body.contains(indicator)) {
            document.body.removeChild(indicator);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving bounding box:', error);
      
      // Clean up indicator in case of error
      const indicator = document.getElementById('bbox-save-indicator');
      if (indicator && document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    }
  };

  const deleteBox = async (boxId) => {
    try {
      // Show deletion indicator
      const deleteIndicator = document.createElement('div');
      deleteIndicator.id = 'bbox-delete-indicator';
      deleteIndicator.className = 'bbox-save-indicator';
      deleteIndicator.textContent = 'Deleting bounding box...';
      document.body.appendChild(deleteIndicator);
      
      console.log(`Attempting to delete box with ID ${boxId} using URL: http://localhost:5000/api/delete-bbox/${boxId}`);
      
      // Use a different URL path
      const response = await fetch(`http://localhost:5000/api/remove-bbox/${boxId}`);
      
      if (response.ok) {
        deleteIndicator.textContent = 'Bounding box deleted!';
        deleteIndicator.style.backgroundColor = 'rgba(40,167,69,0.8)';
        
        // Remove box from state
        const updatedBoxes = boxes.filter(box => box.bbox_id !== boxId);
        setBoxes(updatedBoxes);
        
        // Update displayed boxes for current frame
        const currentFrameBoxes = updatedBoxes.filter(box => box.frameIndex === currentFrame);
        setDisplayedBoxes(currentFrameBoxes);
        
        // Notify parent component
        if (onBoxesUpdate) {
          onBoxesUpdate(updatedBoxes);
        }
        
        setTimeout(() => {
          const indicator = document.getElementById('bbox-delete-indicator');
          if (indicator && document.body.contains(indicator)) {
            document.body.removeChild(indicator);
          }
        }, 2000);
      } else {
        deleteIndicator.textContent = 'Failed to delete bounding box!';
        deleteIndicator.style.backgroundColor = 'rgba(220,53,69,0.8)';
        
        setTimeout(() => {
          const indicator = document.getElementById('bbox-delete-indicator');
          if (indicator && document.body.contains(indicator)) {
            document.body.removeChild(indicator);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error deleting bounding box:', error);
      
      // Clean up indicator
      const indicator = document.getElementById('bbox-delete-indicator');
      if (indicator && document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    }
  };

  useEffect(() => {
    // This effect ensures the canvas dimensions match the video dimensions
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set the canvas size to match the actual video dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Force a redraw when dimensions change
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw existing boxes
    displayedBoxes.forEach(box => {
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Add label text
      ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.fillRect(box.x, box.y - 20, 100, 20);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(box.partLabel, box.x + 5, box.y - 5);
    });
    
    // Draw current box if exists
    if (currentBox) {
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  }, [canvasWidth, canvasHeight, displayedBoxes, currentBox]);

  // Add this function to handle right-click on boxes
  const handleContextMenu = (e) => {
    e.preventDefault();
    console.log("Context menu event fired");
    
    if (!isActive) {
      console.log("Tool not active, ignoring right click");
      return;
    }
    
    // Get mouse coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    console.log(`Right click at position: (${x}, ${y})`);
    console.log("All displayed boxes:", displayedBoxes);
    
    // Check if right-click happened on any box
    const clickedBox = displayedBoxes.find(box => 
      x >= box.x && 
      x <= box.x + box.width && 
      y >= box.y && 
      y <= box.y + box.height
    );
    
    console.log("Right-clicked on box:", clickedBox);
    
    if (clickedBox && clickedBox.bbox_id) {
      console.log(`Will attempt to delete box with ID: ${clickedBox.bbox_id}`);
      if (window.confirm(`Delete ${clickedBox.partLabel} bounding box?`)) {
        console.log("User confirmed deletion");
        // ONLY call deleteBox here
        deleteBox(clickedBox.bbox_id);
      } else {
        console.log("User canceled deletion");
      }
    } else {
      console.log("No box found at click position or missing bbox_id");
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: 2
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
};

export default BoundingBoxTool;
