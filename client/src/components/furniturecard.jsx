import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";

const FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='100%25' height='100%25' fill='%23f3f4f6'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='Arial' font-size='20'>No Image</text></svg>";

// Helper function to extract final image from array or string
const getFinalImage = (imageData) => {
  if (!imageData) return null;
  
  // If it's already an array, get the last element
  if (Array.isArray(imageData)) {
    return imageData.length > 0 ? imageData[imageData.length - 1] : null;
  }
  
  // If it's a string, try to parse as JSON array first
  if (typeof imageData === 'string') {
    try {
      const parsed = JSON.parse(imageData);
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed[parsed.length - 1] : null;
      }
    } catch (e) {
      // Not JSON, treat as single image URL
      return imageData;
    }
    return imageData;
  }
  
  return null;
};

export default function FurnitureCard(props) {
  // Handle different prop naming patterns and provide fallback
  const furniture = props.furniture || props.item || {};
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Memoize the final image extraction to prevent recalculation on every render
  const displayImage = useMemo(() => {
    const finalImg = getFinalImage(furniture?.image);
    console.log('Final image extracted:', finalImg, 'from:', furniture?.image);
    return finalImg;
  }, [furniture?.image]);

  // Early return if no furniture data
  if (!furniture || Object.keys(furniture).length === 0) {
    return (
      <div className="w-full max-w-full sm:max-w-100 h-auto min-h-90 sm:min-h-112.5 rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">
          <p>No furniture data available</p>
        </div>
      </div>
    );
  }

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    };

    // Initial check
    checkAuthStatus();

    // Listen for storage changes (login/logout from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Periodic check for changes in the same tab
    const interval = setInterval(checkAuthStatus, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Debug image URL
  useEffect(() => {
    if (displayImage) {
      console.log('Display image for rendering:', displayImage);
    }
  }, [displayImage]);

  useEffect(() => {
    setImageError(false);
    setImageLoading(true);

    // Set a timeout to hide loader if image doesn't load
    const loadTimeout = setTimeout(() => {
      setImageLoading(false);
    }, 5000); // 5 second timeout

    return () => clearTimeout(loadTimeout);
  }, [displayImage]);

  const addToCart = (item) => {
    try {
      let cart = JSON.parse(localStorage.getItem('furnitureCart')) || [];
      
      // Check if item already exists
      const existingItemIndex = cart.findIndex(cartItem => cartItem._id === item._id);
      
      if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += 1;
        toast.success('Quantity updated in cart!');
      } else {
        cart.push({ ...item, quantity: 1 });
        toast.success('Furniture added to cart!');
      }
      
      localStorage.setItem('furnitureCart', JSON.stringify(cart));
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Failed to add to cart' };
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-100 h-auto min-h-90 sm:min-h-112.5 rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 flex flex-col bg-white hover:shadow-xl hover:scale-102 transition-all duration-300 overflow-hidden gap-2">
      <div className="relative w-full h-44 sm:h-56 lg:h-64 mb-2 sm:mb-3">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
          </div>
        )}
        <img
          key={displayImage || 'fallback'}
          src={imageError || !displayImage ? FALLBACK_IMAGE : displayImage}
          className={`w-full h-full object-cover rounded-lg cursor-pointer transition-opacity duration-300 ${imageLoading && displayImage && !imageError ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => {
            console.log('Image loaded successfully:', displayImage);
            setImageLoading(false);
            setImageError(false);
          }}
          onError={() => {
            console.error('Image failed to load, using fallback:', displayImage);
            setImageError(true);
            setImageLoading(false);
          }}
          alt={furniture?.name || "Furniture item"}
        />
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <h2 className="text-base sm:text-xl font-bold mb-1 sm:mb-2 text-gray-900 line-clamp-2">
          {furniture?.name || "Unnamed Furniture"}
        </h2>
        
        <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3">
          <p className="text-gray-700 text-sm sm:text-base">
            <span className="font-medium">Category:</span> {furniture?.category || "Unknown"}
          </p>
         
          {furniture?.dimensions && (
            <p className="text-gray-700 text-sm sm:text-base">
              <span className="font-medium">Dimensions:</span> {furniture.dimensions}
            </p>
          )}
        </div>
        
        <div className="mt-auto">
          <p className="text-lg sm:text-xl font-bold text-green-600 mb-2 sm:mb-3">
            <span className="text-sm font-medium text-gray-500 pr-2">Price:</span>
            Rs.{furniture?.price ? furniture.price.toFixed(2) : "0.00"}
          </p>
          
          <div className="space-y-2">
            <button
              className="w-full font-medium py-2 px-4 rounded-lg transition-colors duration-200 border border-slate-300 text-slate-700 hover:bg-slate-100"
              onClick={() => navigate(`/furniture/${furniture._id}`)}
            >
              View Details
            </button>

            
            
            
            
            
        
          </div>
        </div>
      </div>
    </div>
  );
}