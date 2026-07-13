import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as dashboardRoute } from './routes/dashboard/index'
import { Route as filesRoute } from './routes/files/index'
import { Route as fileDetailRoute } from './routes/files/$fileId'
import { Route as botsRoute } from './routes/settings/bots'
import { Route as apiKeysRoute } from './routes/settings/api-keys'
import { Route as webhooksRoute } from './routes/settings/webhooks'
import { Route as profileRoute } from './routes/settings/profile'
import { Route as shareRoute } from './routes/share/$shareToken'
import { Route as auditRoute } from './routes/audit/index'
import { Route as loginRoute } from './routes/login/index'
import { Route as registerRoute } from './routes/register/index'

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  shareRoute,
  dashboardRoute,
  filesRoute,
  fileDetailRoute,
  botsRoute,
  apiKeysRoute,
  webhooksRoute,
  profileRoute,
  auditRoute,
])
