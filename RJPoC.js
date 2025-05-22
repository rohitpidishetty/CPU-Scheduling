class Payload {
  CLUSTER = [];
  AVERAGE = 0;
  JOB_QUEUE = [];
  constructor(avg, cluster, jobQueue) {
    this.AVERAGE = avg;
    this.CLUSTER = cluster;
    this.JOB_QUEUE = jobQueue;
  }
}
export class RJPoC {
  constructor() {}

  leastTopTime(cluster) {
    var temp = cluster.slice();
    temp.sort((a, b) => {
      return a[2] - b[2];
    });
    return temp[0][0];
  }

  findReadyJobs(jobId, jobInitTime, cluster) {
    if (jobId != "JE") {
      var readyQueue = [];
      for (var a = 0; a < cluster.length; a++) {
        for (var i = 0; i < cluster[a][1].length; i++) {
          if (
            cluster[a][1][i][1] <= jobInitTime &&
            cluster[a][1][i][0] != "JE" &&
            cluster[a][1][i][4] > jobInitTime &&
            cluster[a][1][i][3] >= jobInitTime
          ) {
            readyQueue.push(cluster[a][1][i][0]);
          }
        }
      }
      return JSON.stringify(jobInitTime) + "-" + JSON.stringify(readyQueue);
    }
    return null;
  }

  defineJobQueues(cluster) {
    var jobQueue = new Map();
    for (var a = 0; a < cluster.length; a++) {
      for (var i = 0; i < cluster[a][1].length; i++) {
        let at_jq = this.findReadyJobs(
          cluster[a][1][i][0],
          cluster[a][1][i][3],
          cluster
        );
        if (at_jq != null) {
          let at = at_jq.split("-")[0];
          let jq = JSON.parse(at_jq.split("-")[1]);
          jobQueue.set(at, jq);
        }
      }
    }
    var finalJobQueue = [];
    jobQueue.forEach((readyJobs, startTime) =>
      finalJobQueue.push([parseInt(startTime), readyJobs])
    );
    finalJobQueue.sort((a, b) => {
      return a[0] - b[0];
    });
    return finalJobQueue;
  }

  findBestJob(pointer, payload, config) {
    var sendJob = null;
    if (config == "sjf") {
      payload.sort((a, b) => {
        return a[2] - b[2];
      });
      for (let job of payload) {
        if (job[1] <= pointer[2]) {
          sendJob = job;
          break;
        }
      }
      if (sendJob == null) {
        payload.sort((a, b) => {
          return a[1] - b[1];
        });
        sendJob = payload[0];
      }
    }
    if (config == "fcfs") {
      payload.sort((a, b) => {
        return a[1] - b[1];
      });
      sendJob = payload[0];
    }
    return sendJob;
  }

  computerAverageTurnArroundTime(cluster, nojs) {
    let sum = 0;
    for (var a = 0; a < cluster.length; a++) {
      for (var i = 0; i < cluster[a][1].length; i++)
        if (cluster[a][1][i][0] != "JE") sum += cluster[a][1][i][5];
    }
    let avg = sum / nojs;
    return new Payload(avg, cluster, this.defineJobQueues(cluster));
  }

  computerTurnArrounds(cluster, nojs) {
    for (var a = 0; a < cluster.length; a++) {
      for (var i = 0; i < cluster[a][1].length; i++)
        cluster[a][1][i].push(cluster[a][1][i][4] - cluster[a][1][i][1]);
    }
    return this.computerAverageTurnArroundTime(cluster, nojs);
  }

  computeHalts(cluster, nojs) {
    for (var a = 0; a < cluster.length; a++) {
      for (var i = 0; i < cluster[a][1].length; i++)
        cluster[a][1][i].push(cluster[a][1][i][2] + cluster[a][1][i][3]);
    }
    return this.computerTurnArrounds(cluster, nojs);
  }

  computeNewArrivals(cluster, nojs) {
    for (var a = 0; a < cluster.length; a++) {
      for (var i = 0; i < cluster[a][1].length; i++) {
        if (i == 0) cluster[a][1][i].push(0);
        else
          cluster[a][1][i].push(
            cluster[a][1][i - 1][2] + cluster[a][1][i - 1][3]
          );
      }
    }
    return this.computeHalts(cluster, nojs);
  }

  postJobsOnCluster(nocs, nojs, ats, bts, config) {
    var cluster = [];
    for (var i = 0; i < nocs; i++) {
      cluster.push([`CPU_${i}`, new Array(), 0]);
    }
    var payload = [];
    var remJobs = [];
    for (var i = 0; i < nojs; i++) {
      var jobId = `J${i + 1}`;
      var data = [jobId, ats[i], bts[i]];
      payload.push(data);
      remJobs.push(jobId);
    }

    if (config == "sjf") {
      payload.sort((a, b) => {
        return a[2] - b[2];
      });
      while (payload.length != 0) {
        var cpu = this.leastTopTime(cluster);
        var cpuIdx = parseInt(cpu.split("_")[1]);
        var pointer = cluster[cpuIdx];
        var bestJob = this.findBestJob(pointer, payload, "sjf");
        if (parseInt(bestJob[1]) > parseInt(pointer[2])) {
          var slab = parseInt(bestJob[1]) - parseInt(pointer[2]);
          cluster[cpuIdx][1].push(["JE", 0, slab]);
          cluster[cpuIdx][2] += slab;
        }
        cluster[cpuIdx][1].push(bestJob);
        cluster[cpuIdx][2] += parseInt(bestJob[2]);
        payload = payload.filter(job => {
          return job != bestJob;
        });
      }
      return this.computeNewArrivals(cluster, nojs);
    }
    if (config == "fcfs") {
      payload.sort((a, b) => {
        return a[1] - b[1];
      });
      while (payload.length != 0) {
        var cpu = this.leastTopTime(cluster);
        var cpuIdx = parseInt(cpu.split("_")[1]);
        var pointer = cluster[cpuIdx];
        var bestJob = this.findBestJob(pointer, payload, "fcfs");
        if (parseInt(bestJob[1]) > parseInt(pointer[2])) {
          var slab = parseInt(bestJob[1]) - parseInt(pointer[2]);
          cluster[cpuIdx][1].push(["JE", 0, slab]);
          cluster[cpuIdx][2] += slab;
        }
        cluster[cpuIdx][1].push(bestJob);
        cluster[cpuIdx][2] += parseInt(bestJob[2]);
        payload = payload.filter(job => {
          return job != bestJob;
        });
      }
      return this.computeNewArrivals(cluster, nojs);
    }
  }
}
// ###########################################################################
// Run the program manually on CLI (command line interface).
// ###########################################################################
// let obj = new RJPoC();
// let nocs = 3;
// let ats = [0, 2, 4, 6, 8, 10, 11];
// let bts = [20, 10, 12, 15, 8, 10, 6];
// let nojs = 7;
// let config = "fcfs";
// let data = obj.postJobsOnCluster(nocs, nojs, ats, bts, config);
// console.log(data);
