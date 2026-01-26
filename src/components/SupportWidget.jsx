import { useEffect } from 'react'

// Support Widget Component
// Integrates with Crisp, Intercom, or custom support widget

const SupportWidget = () => {
  useEffect(() => {
    const provider = import.meta.env.VITE_SUPPORT_PROVIDER || 'crisp'
    const apiKey = import.meta.env.VITE_SUPPORT_API_KEY

    if (!apiKey) {
      console.warn('Support widget API key not configured')
      return
    }

    if (provider === 'crisp') {
      // Crisp integration
      if (typeof window !== 'undefined' && window.$crisp) {
        window.$crisp.push(['set', 'user:email', apiKey]) // Use API key as identifier
        console.log('✅ Crisp support widget initialized')
      } else {
        // Load Crisp script
        const script = document.createElement('script')
        script.src = 'https://client.crisp.chat/l.js'
        script.async = true
        script.setAttribute('data-crisp-website-id', apiKey)
        document.head.appendChild(script)
      }
    } else if (provider === 'intercom') {
      // Intercom integration
      if (typeof window !== 'undefined' && window.Intercom) {
        window.Intercom('boot', {
          app_id: apiKey,
        })
        console.log('✅ Intercom support widget initialized')
      } else {
        // Load Intercom script
        const script = document.createElement('script')
        script.innerHTML = `
          (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/${apiKey}';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
        `
        document.head.appendChild(script)
      }
    }
  }, [])

  return null // This component doesn't render anything
}

export default SupportWidget
