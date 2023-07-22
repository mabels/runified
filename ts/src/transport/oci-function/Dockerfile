FROM fnproject/node:18-dev as build-stage
WORKDIR /function
FROM fnproject/node:18
WORKDIR /function
ADD . /function/
RUN chmod -R o+r /function
ENTRYPOINT ["node", "func.js"]
