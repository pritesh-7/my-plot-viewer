import React, { useState, useRef, useEffect } from 'react';
import { Home, Share2, Info, Image, MapPin, Search, X, ZoomIn, ZoomOut } from 'lucide-react';

const PlotViewer = () => {
  const [statusVisible, setStatusVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  
  // Image dimensions - DOUBLED
  const imageWidth = 4476;
  const imageHeight = 4928;
  const canvasWidth = imageWidth;
  const canvasHeight = imageHeight;
  
  // Plot data with coordinates from OpenCV
  const plots = [
    { 
      id: 1, 
      number: '1', 
      status: 'sold', 
      area: 1200,
      areaSqFt: 10800,
      polygon: [[245, 1292], [390, 1292], [390, 1359], [245, 1359]]
    },
    { 
      id: 2, 
      number: '2', 
      status: 'sold', 
      area: 1180,
      areaSqFt: 10620,
      polygon: [[245, 1359], [390, 1359], [390, 1425], [245, 1425]]
    },
    { 
      id: 3, 
      number: '3', 
      status: 'sold', 
      area: 1150,
      areaSqFt: 10350,
      polygon: [[245, 1425], [390, 1425], [390, 1494], [245, 1494]]
    },
    { 
      id: 4, 
      number: '4', 
      status: 'available', 
      area: 1170,
      areaSqFt: 10530,
      polygon: [[245, 1494], [390, 1494], [390, 1561], [245, 1561]]
    },
    { 
      id: 5, 
      number: '5', 
      status: 'sold', 
      area: 1190,
      areaSqFt: 10710,
      polygon: [[245, 1561], [390, 1561], [390, 1628], [245, 1628]]
    },
    { 
      id: 6, 
      number: '6', 
      status: 'sold', 
      area: 1160,
      areaSqFt: 10440,
      polygon: [[245, 1628], [390, 1628], [390, 1696], [245, 1696]]
    },
    { 
      id: 8, 
      number: '8', 
      status: 'available', 
      area: 1100,
      areaSqFt: 9900,
      polygon: [
        [247, 764],
        [249, 759],
        [252, 753],
        [256, 750],
        [259, 748],
        [262, 747],
        [266, 747],
        [390, 747],
        [390, 818],
        [247, 818]
      ]
    },
    {
      id: 9,
      number: '9',
      status: 'available',
      area: 1050,
      areaSqFt: 9450,
      rotation: -15, // Rotated plot
      polygon: [
        [700, 495],
        [633, 582],
        [777, 593],
        [854, 503]
      ]
    },
    {
      id: 'common1',
      number: 'COMMON PLOT 1',
      status: 'noinfo',
      area: 0,
      areaSqFt: 0,
      isCommonArea: true,
      isGarden: true, // Mark as garden area
      polygon: [
        [1248, 748],
        [1691, 746],
        [1277, 1382],
        [1248, 1408]
      ]
    },
  ];

  const statusColors = {
    available: '#46AADB',
    sold: '#D40B2B',
    selected: '#2b86db',
    noinfo: '#838383'
  };

  const getPlotColor = (status) => {
    if (!statusVisible) return '#CFC4AA'; // Beige when status is off
    return statusColors[status] || '#666';
  };

  const handlePlotClick = (plot) => {
    setSelectedPlot(plot);
  };

  // Don't filter plots, just highlight the searched one
  const searchedPlot = searchQuery 
    ? plots.find(plot => plot.number.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  // Auto-zoom to searched plot
  useEffect(() => {
    if (searchQuery && searchedPlot) {
      const plot = searchedPlot;
      const centerX = plot.polygon.reduce((sum, p) => sum + p[0], 0) / plot.polygon.length;
      const centerY = plot.polygon.reduce((sum, p) => sum + p[1], 0) / plot.polygon.length;
      
      // Zoom to 1.2 and center on plot
      setZoom(1.2);
      const containerWidth = containerRef.current?.clientWidth || 800;
      const containerHeight = containerRef.current?.clientHeight || 700;
      
      setPan({
        x: containerWidth / 2 - centerX * 1.2,
        y: containerHeight / 2 - centerY * 1.2
      });
    }
  }, [searchQuery, searchedPlot]);

  // Draw plots on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas - transparent background
    ctx.clearRect(0, 0, width, height);
    
    // Draw layout border with road color background
    const layoutBorder = [
      [150, 475],
      [427, 424],
      [1837, 525],
      [1277, 1383],
      [1248, 1407],
      [1144, 1497],
      [238, 2280],
      [150, 2221]
    ];
    
    ctx.save();
    // Fill with road color
    ctx.fillStyle = '#505050';
    ctx.beginPath();
    layoutBorder.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point[0], point[1]);
      } else {
        ctx.lineTo(point[0], point[1]);
      }
    });
    ctx.closePath();
    ctx.fill();
    
    // Draw black border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    
    // Draw all plots
    plots.forEach(plot => {
      ctx.save();
      
      if (plot.polygon) {
        // Check if this plot is being searched or selected
        const isSearched = searchedPlot && searchedPlot.id === plot.id;
        const isSelected = selectedPlot && selectedPlot.id === plot.id;
        
        // Determine color based on state
        let fillColor;
        if (plot.isGarden) {
          // Garden area - always green, not affected by status toggle
          fillColor = '#7CAF5E';
        } else if (isSearched || isSelected) {
          fillColor = statusColors.selected; // Blue when selected or searched
        } else {
          fillColor = getPlotColor(plot.status);
        }
        
        // Draw polygon plot
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = '#000000'; // Black border
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        plot.polygon.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point[0], point[1]);
          } else {
            ctx.lineTo(point[0], point[1]);
          }
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw garden pattern if it's a garden area
        if (plot.isGarden) {
          // Draw tree/plant symbols
          ctx.fillStyle = '#5A9041';
          const centerX = plot.polygon.reduce((sum, p) => sum + p[0], 0) / plot.polygon.length;
          const centerY = plot.polygon.reduce((sum, p) => sum + p[1], 0) / plot.polygon.length;
          
          // Draw multiple small circles to represent trees/plants
          const treePositions = [
            [centerX - 80, centerY - 100],
            [centerX + 60, centerY - 80],
            [centerX - 50, centerY + 50],
            [centerX + 70, centerY + 60],
            [centerX - 10, centerY - 30],
            [centerX + 20, centerY + 20],
            [centerX - 100, centerY + 20],
            [centerX + 90, centerY - 20]
          ];
          
          treePositions.forEach(pos => {
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Add smaller circles for detail
            ctx.beginPath();
            ctx.arc(pos[0] - 8, pos[1] - 8, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(pos[0] + 8, pos[1] - 8, 10, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        
        // Calculate center for text
        let centerX, centerY;
        
        // Special handling for plot 8 with rounded corner - use the main rectangle center
        if (plot.id === 8) {
          // Use only the main rectangle points (ignoring the small rounded corner)
          centerX = (266 + 390) / 2; // Average of left edge (after curve) and right edge
          centerY = (747 + 818) / 2; // Average of top and bottom
        } else {
          // For regular plots, calculate center from all points
          centerX = plot.polygon.reduce((sum, p) => sum + p[0], 0) / plot.polygon.length;
          centerY = plot.polygon.reduce((sum, p) => sum + p[1], 0) / plot.polygon.length;
        }
        
        // Determine font color
        const fontColor = (isSearched || isSelected) ? '#ffffff' : '#292929';
        
        // Draw plot number/text
        ctx.fillStyle = fontColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Check if this is a common area (text label instead of number)
        if (plot.isCommonArea) {
          ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
          ctx.fillText(plot.number, centerX, centerY);
        } else {
          ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
          
          // Handle rotated plots (like plot 9)
          if (plot.rotation) {
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate((plot.rotation * Math.PI) / 180);
            ctx.fillText(plot.number, 0, isSearched || isSelected ? -12 : 0);
            
            if (isSearched || isSelected) {
              ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
              ctx.fillStyle = fontColor;
              ctx.fillText(`${plot.areaSqFt.toLocaleString()} ft²`, 0, 15);
            }
            ctx.restore();
          } else if (isSearched || isSelected) {
            // When selected, show number above center and ft² below
            ctx.fillText(plot.number, centerX, centerY - 12);
            
            // Draw only square feet below the number
            ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = fontColor;
            ctx.fillText(`${plot.areaSqFt.toLocaleString()} ft²`, centerX, centerY + 15);
          } else {
            // When not selected, show number exactly in center
            ctx.fillText(plot.number, centerX, centerY);
          }
        }
      }
      
      ctx.restore();
    });
    
    // Draw dashed line with 3 coordinates
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 10]); // Dashed pattern: 15px dash, 10px gap
    
    ctx.beginPath();
    ctx.moveTo(18, 429);
    ctx.lineTo(417, 378);
    ctx.lineTo(1961, 494);
    ctx.stroke();
    ctx.setLineDash([]); // Reset to solid line
    ctx.restore();
    
    // Draw road labels (static text, not part of plots array)
    ctx.save();
    ctx.fillStyle = '#292929';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    
    // Horizontal road label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('9.00 MT WIDE ROAD', 838, 716);
    
    // Vertical road label (270° rotated - clockwise)
    ctx.translate(569, 1049);
    ctx.rotate(Math.PI / 2); // Rotate 90° clockwise (270° counter-clockwise)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('9.00 MT WIDE ROAD', 0, 0);
    
    ctx.restore();
  }, [plots, searchedPlot, selectedPlot, statusVisible]);

  // Handle canvas click
  const handleCanvasClick = (e) => {
    // This is now mainly handled in handleMouseUp
    // But keep this as a backup for touch/click events
    if (hasDragged) {
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    // Check if click is inside any plot
    let foundPlot = false;
    for (const plot of plots) {
      if (plot.polygon) {
        if (isPointInPolygon([x, y], plot.polygon)) {
          handlePlotClick(plot);
          foundPlot = true;
          break;
        }
      }
    }
    
    // If clicked outside plot, close popup
    if (!foundPlot) {
      setSelectedPlot(null);
    }
  };
  
  // Helper function to check if point is inside polygon
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      
      const intersect = ((yi > point[1]) !== (yj > point[1]))
        && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleZoom = (direction, mouseX, mouseY) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    
    // Use provided mouse position or center of screen
    const clientX = mouseX !== undefined ? mouseX : rect.left + rect.width / 2;
    const clientY = mouseY !== undefined ? mouseY : rect.top + rect.height / 2;
    
    // Get the point in canvas coordinates before zoom
    const pointX = (clientX - rect.left - pan.x) / zoom;
    const pointY = (clientY - rect.top - pan.y) / zoom;
    
    // Calculate new zoom
    const newZoom = direction === 'in' ? zoom * 1.3 : zoom / 1.3;
    const clampedZoom = Math.max(0.25, Math.min(newZoom, 3));
    
    // Calculate new pan to keep the point under the cursor
    const newPanX = clientX - rect.left - pointX * clampedZoom;
    const newPanY = clientY - rect.top - pointY * clampedZoom;
    
    setZoom(clampedZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoom('in', e.clientX, e.clientY);
    } else {
      handleZoom('out', e.clientX, e.clientY);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = Math.abs(e.clientX - dragStart.x - pan.x);
    const deltaY = Math.abs(e.clientY - dragStart.y - pan.y);
    
    // If moved more than 5 pixels, consider it a drag
    if (deltaX > 5 || deltaY > 5) {
      setHasDragged(true);
    }
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
    e.preventDefault();
  };

  const handleMouseUp = (e) => {
    const wasDragging = isDragging;
    const draggedDistance = hasDragged;
    
    setIsDragging(false);
    
    // If we didn't drag more than 5 pixels, treat it as a click
    if (wasDragging && !draggedDistance) {
      // This is a click, not a drag
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      // Check if click is inside any plot
      let foundPlot = false;
      for (const plot of plots) {
        if (plot.polygon) {
          if (isPointInPolygon([x, y], plot.polygon)) {
            handlePlotClick(plot);
            foundPlot = true;
            break;
          }
        }
      }
      
      // If clicked outside plot, close popup
      if (!foundPlot) {
        setSelectedPlot(null);
      }
    }
    
    // Reset drag flag
    setTimeout(() => setHasDragged(false), 100);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowInfo(true)}>
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-gray-900">WS</span>
          </div>
          <div className="text-sm">
            <div className="font-semibold">Worldspace</div>
            <div className="text-xs text-gray-300">Industrial Park</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-right">
            <div className="text-gray-300">Get your design</div>
            <div className="font-semibold">9662906600</div>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur">
            <span className="text-sm font-bold">S</span>
          </div>
        </div>
      </header>

      {/* North Indicator */}
      <div className="absolute top-24 left-4 z-40 bg-black/50 backdrop-blur rounded-2xl p-3">
        <svg width="58" height="63" viewBox="0 0 58 63" fill="none">
          <path d="M22.5444 43.5946V25.8581H25.4136C26.7873 27.6491 28.0914 29.5445 29.326 31.5442C30.5606 33.5265 31.6822 35.5697 32.6908 37.6737L32.456 32.3789V25.8581H35.4556V43.5946H32.5864C31.4736 41.4036 30.3172 39.2039 29.1174 36.9956C27.9349 34.7698 26.6743 32.6745 25.3353 30.7096L25.544 36.813V43.5946H22.5444Z" fill="white"/>
          <path d="M15.5747 11.0736L28.9998 1.81488L42.4248 11.0736" stroke="#F3F3F3" strokeWidth="3"/>
        </svg>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-hidden relative"
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div 
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'none'
          }}
          onMouseDown={handleMouseDown}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onClick={handleCanvasClick}
            className="block cursor-pointer"
            style={{ 
              imageRendering: 'auto',
              display: 'block'
            }}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-24 right-4 flex flex-col gap-2 z-40">
        <button 
          onClick={() => handleZoom('in')}
          className="w-12 h-12 bg-black/70 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110 shadow-xl"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={() => handleZoom('out')}
          className="w-12 h-12 bg-black/70 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110 shadow-xl"
        >
          <ZoomOut size={20} />
        </button>
        <button 
          onClick={() => {
            setZoom(0.35);
            setPan({ x: 0, y: 0 });
          }}
          className="w-12 h-12 bg-black/70 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110 shadow-xl text-xs font-bold"
        >
          1:1
        </button>
      </div>

      {/* Status Indicators */}
      {statusVisible && (
        <div className="absolute bottom-48 right-4 bg-black/70 backdrop-blur-lg rounded-2xl p-4 space-y-3 shadow-2xl z-40">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: statusColors.available }}></div>
            <span className="text-sm font-medium">Available</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: statusColors.sold }}></div>
            <span className="text-sm font-medium">Sold</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shadow-lg" style={{ backgroundColor: statusColors.noinfo }}></div>
            <span className="text-sm font-medium">No Info</span>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-4 z-40">
        <div className="flex items-center gap-4">
          <div className="bg-black/70 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-4 shadow-xl">
            <span className="text-sm font-medium">Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={statusVisible}
                onChange={(e) => setStatusVisible(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-gray-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-500 rounded-full peer transition-all peer-checked:bg-green-500"></div>
              <span className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-all peer-checked:left-7"></span>
            </label>
          </div>

          <button className="w-12 h-12 bg-black/70 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110 shadow-xl">
            <Share2 size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="bg-black/70 backdrop-blur-lg rounded-full px-4 py-3 flex items-center gap-2 shadow-xl">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search Plot"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm w-32 placeholder-gray-400"
            />
          </div>

          <button 
            className="bg-black/70 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-2 hover:bg-black/90 transition-all hover:scale-105 shadow-xl"
            onClick={() => setShowGallery(true)}
          >
            <Image size={18} />
            <span className="text-sm font-medium">Gallery</span>
          </button>

          <button 
            className="bg-black/70 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-2 hover:bg-black/90 transition-all hover:scale-105 shadow-xl"
            onClick={() => setShowInfo(true)}
          >
            <Info size={18} />
            <span className="text-sm font-medium">Info</span>
          </button>

          <button className="bg-black/70 backdrop-blur-lg rounded-full px-6 py-3 flex items-center gap-2 hover:bg-black/90 transition-all hover:scale-105 shadow-xl">
            <MapPin size={18} />
            <span className="text-sm font-medium">Locate</span>
          </button>

          <button className="w-12 h-12 bg-black/70 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110 shadow-xl">
            <Home size={20} />
          </button>

          <button className="w-12 h-12 bg-black/70 backdrop-blur-lg rounded-full flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110 shadow-xl">
            <span className="text-sm font-bold">3D</span>
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-3xl p-6 max-w-xl w-full relative shadow-2xl">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="text-center mb-4">
              <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">WS</span>
              </div>
              <h2 className="text-xl font-bold mb-3">Worldspace Industrial Park</h2>
            </div>
            
            <p className="text-gray-300 mb-4 leading-relaxed text-sm">
              A built-to-suit Industrial and Logistics Park situated 18 kilometers from the bustling 
              seaport of Mundra, Gujarat. The park offers world-class solutions in the prime hub 
              surrounded by a favorable industrial and social ecosystem for commerce and trade.
            </p>
            
            <div className="bg-gray-800 rounded-xl p-3 mb-4">
              <div className="text-sm text-gray-400">Total Area</div>
              <div className="text-xl font-bold">252,675.01 <span className="text-sm text-gray-400">sq.Yard</span></div>
            </div>
            
            <div className="flex gap-2 justify-center">
              <button className="w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center text-lg">📱</button>
              <button className="w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center text-lg">📧</button>
              <button className="w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center text-lg">🌐</button>
              <button className="w-10 h-10 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center text-lg">💬</button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {showGallery && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-3xl p-6 w-full max-w-4xl max-h-[85vh] overflow-auto relative shadow-2xl">
            <button
              onClick={() => setShowGallery(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors z-10"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-4">Gallery</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={i} className="aspect-video bg-gray-800 rounded-lg overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <Image size={36} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Plot Info - Tooltip Style */}
      {selectedPlot && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/95 backdrop-blur-lg rounded-2xl p-8 z-40 shadow-2xl border border-gray-700">
          <button
            onClick={() => setSelectedPlot(null)}
            className="absolute top-3 right-3 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
          
          <div className="text-center mb-6">
            <div className="text-5xl font-bold mb-4" style={{ color: getPlotColor(selectedPlot.status) }}>
              {selectedPlot.number}
            </div>
            <div className="text-sm text-gray-400">Plot Number</div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Status</div>
              <div className="font-semibold capitalize text-lg flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getPlotColor(selectedPlot.status) }}
                ></div>
                {selectedPlot.status}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Area</div>
              <div className="font-semibold text-base text-gray-300">
                {selectedPlot.areaSqFt.toLocaleString()} <span className="text-sm text-gray-400">ft²</span>
              </div>
            </div>
          </div>

          <button className="w-full bg-blue-500 hover:bg-blue-600 transition-colors rounded-lg py-3 font-semibold">
            Inquire Now
          </button>
        </div>
      )}
    </div>
  );
};

export default PlotViewer;
