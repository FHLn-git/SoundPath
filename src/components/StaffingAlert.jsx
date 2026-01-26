import { motion } from 'framer-motion'
import { AlertTriangle, Users } from 'lucide-react'

const StaffingAlert = ({ companyHealth }) => {
  if (!companyHealth || !companyHealth.staffingAlert) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full mb-6"
    >
      <div className="bg-gray-900/80 backdrop-blur-sm border-2 border-red-500/60 rounded-lg p-4 flex items-center justify-between gap-4 shadow-lg shadow-red-500/10">
        <div className="flex items-center gap-3 flex-1">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-mono text-gray-200 font-semibold mb-1">
              ⚠️ BOGGED DOWN: Submission volume exceeds human capacity.
            </p>
            <p className="text-xs font-mono text-gray-400">
              Staff burnout risk is HIGH. Current company health score: {companyHealth.companyHealthScore}%
            </p>
            <p className="text-xs font-mono text-gray-500 mt-1">
              {companyHealth.dailyDemos} demos today ÷ {companyHealth.totalStaff} staff = {companyHealth.demosPerStaff.toFixed(1)} demos/staff (Cap: {companyHealth.expectationCap}/day)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 rounded-lg border border-red-500/50">
          <Users className="text-red-400" size={18} />
          <span className="text-red-400 font-semibold text-sm">
            {companyHealth.fatiguedStaffCount} Staff Fatigued
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default StaffingAlert
