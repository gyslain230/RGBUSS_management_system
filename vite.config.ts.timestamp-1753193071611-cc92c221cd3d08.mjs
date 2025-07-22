// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  server: {
    historyApiFallback: {
      index: "/index.html",
      rewrites: [
        { from: /^\/dashboard/, to: "/index.html" },
        { from: /^\/stock/, to: "/index.html" },
        { from: /^\/sales/, to: "/index.html" },
        { from: /^\/reports/, to: "/index.html" },
        { from: /^\/users/, to: "/index.html" },
        { from: /^\/credits/, to: "/index.html" },
        { from: /^\/login/, to: "/index.html" },
        { from: /^\/register/, to: "/index.html" }
      ]
    }
  },
  preview: {
    historyApiFallback: {
      index: "/index.html",
      rewrites: [
        { from: /^\/dashboard/, to: "/index.html" },
        { from: /^\/stock/, to: "/index.html" },
        { from: /^\/sales/, to: "/index.html" },
        { from: /^\/reports/, to: "/index.html" },
        { from: /^\/users/, to: "/index.html" },
        { from: /^\/credits/, to: "/index.html" },
        { from: /^\/login/, to: "/index.html" },
        { from: /^\/register/, to: "/index.html" }
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhpc3RvcnlBcGlGYWxsYmFjazoge1xuICAgICAgaW5kZXg6ICcvaW5kZXguaHRtbCcsXG4gICAgICByZXdyaXRlczogW1xuICAgICAgICB7IGZyb206IC9eXFwvZGFzaGJvYXJkLywgdG86ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBmcm9tOiAvXlxcL3N0b2NrLywgdG86ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBmcm9tOiAvXlxcL3NhbGVzLywgdG86ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBmcm9tOiAvXlxcL3JlcG9ydHMvLCB0bzogJy9pbmRleC5odG1sJyB9LFxuICAgICAgICB7IGZyb206IC9eXFwvdXNlcnMvLCB0bzogJy9pbmRleC5odG1sJyB9LFxuICAgICAgICB7IGZyb206IC9eXFwvY3JlZGl0cy8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICAgIHsgZnJvbTogL15cXC9sb2dpbi8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICAgIHsgZnJvbTogL15cXC9yZWdpc3Rlci8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICBdXG4gICAgfSxcbiAgfSxcbiAgcHJldmlldzoge1xuICAgIGhpc3RvcnlBcGlGYWxsYmFjazoge1xuICAgICAgaW5kZXg6ICcvaW5kZXguaHRtbCcsXG4gICAgICByZXdyaXRlczogW1xuICAgICAgICB7IGZyb206IC9eXFwvZGFzaGJvYXJkLywgdG86ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBmcm9tOiAvXlxcL3N0b2NrLywgdG86ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBmcm9tOiAvXlxcL3NhbGVzLywgdG86ICcvaW5kZXguaHRtbCcgfSxcbiAgICAgICAgeyBmcm9tOiAvXlxcL3JlcG9ydHMvLCB0bzogJy9pbmRleC5odG1sJyB9LFxuICAgICAgICB7IGZyb206IC9eXFwvdXNlcnMvLCB0bzogJy9pbmRleC5odG1sJyB9LFxuICAgICAgICB7IGZyb206IC9eXFwvY3JlZGl0cy8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICAgIHsgZnJvbTogL15cXC9sb2dpbi8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICAgIHsgZnJvbTogL15cXC9yZWdpc3Rlci8sIHRvOiAnL2luZGV4Lmh0bWwnIH0sXG4gICAgICBdXG4gICAgfSxcbiAgfSxcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixvQkFBb0I7QUFBQSxNQUNsQixPQUFPO0FBQUEsTUFDUCxVQUFVO0FBQUEsUUFDUixFQUFFLE1BQU0sZ0JBQWdCLElBQUksY0FBYztBQUFBLFFBQzFDLEVBQUUsTUFBTSxZQUFZLElBQUksY0FBYztBQUFBLFFBQ3RDLEVBQUUsTUFBTSxZQUFZLElBQUksY0FBYztBQUFBLFFBQ3RDLEVBQUUsTUFBTSxjQUFjLElBQUksY0FBYztBQUFBLFFBQ3hDLEVBQUUsTUFBTSxZQUFZLElBQUksY0FBYztBQUFBLFFBQ3RDLEVBQUUsTUFBTSxjQUFjLElBQUksY0FBYztBQUFBLFFBQ3hDLEVBQUUsTUFBTSxZQUFZLElBQUksY0FBYztBQUFBLFFBQ3RDLEVBQUUsTUFBTSxlQUFlLElBQUksY0FBYztBQUFBLE1BQzNDO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLG9CQUFvQjtBQUFBLE1BQ2xCLE9BQU87QUFBQSxNQUNQLFVBQVU7QUFBQSxRQUNSLEVBQUUsTUFBTSxnQkFBZ0IsSUFBSSxjQUFjO0FBQUEsUUFDMUMsRUFBRSxNQUFNLFlBQVksSUFBSSxjQUFjO0FBQUEsUUFDdEMsRUFBRSxNQUFNLFlBQVksSUFBSSxjQUFjO0FBQUEsUUFDdEMsRUFBRSxNQUFNLGNBQWMsSUFBSSxjQUFjO0FBQUEsUUFDeEMsRUFBRSxNQUFNLFlBQVksSUFBSSxjQUFjO0FBQUEsUUFDdEMsRUFBRSxNQUFNLGNBQWMsSUFBSSxjQUFjO0FBQUEsUUFDeEMsRUFBRSxNQUFNLFlBQVksSUFBSSxjQUFjO0FBQUEsUUFDdEMsRUFBRSxNQUFNLGVBQWUsSUFBSSxjQUFjO0FBQUEsTUFDM0M7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
